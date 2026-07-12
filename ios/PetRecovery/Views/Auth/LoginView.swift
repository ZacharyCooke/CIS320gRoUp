import SwiftUI

struct LoginView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var totpCode = ""
    @State private var pendingUserId: String?
    @State private var screen: Screen = .credentials
    @State private var error: String?
    @State private var isLoading = false

    enum Screen { case credentials, totp }

    var body: some View {
        NavigationStack {
            Group {
                if screen == .credentials {
                    credentialsForm
                } else {
                    totpForm
                }
            }
            .navigationTitle(screen == .credentials ? "Sign In" : "Two-Factor Auth")
        }
    }

    // MARK: – Credentials screen

    private var credentialsForm: some View {
        Form {
            Section {
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                SecureField("Password", text: $password)
                    .textContentType(.password)
            }

            if let error {
                Section { Text(error).foregroundStyle(.red).accessibilityLabel("Error: \(error)") }
            }

            Section {
                Button("Sign In") {
                    Task { await login() }
                }
                .disabled(isLoading || email.isEmpty || password.isEmpty)

                NavigationLink("Create account", destination: RegisterView())
            }
        }
    }

    // MARK: – TOTP challenge screen (T076 depends on T077 — TwoFactorSetupView must exist first)

    private var totpForm: some View {
        Form {
            Section("Microsoft Authenticator") {
                Text("Open Microsoft Authenticator and enter the 6-digit code for PetRecovery.")
                    .foregroundStyle(.secondary)
                TextField("6-digit code", text: $totpCode)
                    .keyboardType(.numberPad)
                    .textContentType(.oneTimeCode)
                    .font(.system(.body, design: .monospaced))
                    .accessibilityHint("Enter the 6-digit code from Microsoft Authenticator")
            }

            if let error {
                Section { Text(error).foregroundStyle(.red).accessibilityLabel("Error: \(error)") }
            }

            Section {
                Button("Verify") {
                    Task { await verifyTotp() }
                }
                .disabled(isLoading || totpCode.count != 6)

                Button("Back to sign in") {
                    screen = .credentials
                    error = nil
                    totpCode = ""
                }
                .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: – Actions

    private func login() async {
        isLoading = true
        error = nil
        do {
            let result = try await APIClient.shared.login(email: email, password: password)
            if result.requires_2fa == true, let uid = result.user_id {
                pendingUserId = uid
                screen = .totp
            }
        } catch {
            self.error = "Sign in failed — check your email and password."
        }
        isLoading = false
    }

    private func verifyTotp() async {
        guard let uid = pendingUserId else { return }
        isLoading = true
        error = nil
        do {
            let success = try await APIClient.shared.verifyTwoFactor(userId: uid, code: totpCode)
            if !success {
                error = "Invalid code — check Authenticator and try again."
                totpCode = ""
            }
        } catch {
            self.error = "Invalid code — check Authenticator and try again."
            totpCode = ""
        }
        isLoading = false
    }
}
