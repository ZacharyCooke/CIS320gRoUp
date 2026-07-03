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
                Section { Text(error).foregroundStyle(.red) }
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
            }

            if let error {
                Section { Text(error).foregroundStyle(.red) }
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
        struct Body: Encodable { let email, password: String }
        struct LoginResponse: Decodable {
            let access_token: String?
            let refresh_token: String?
            let requires_2fa: Bool?
            let user_id: String?
        }
        do {
            let (data, _) = try await APIClient.shared.request(
                path: "auth/login", method: "POST",
                body: Body(email: email, password: password)
            )
            let resp = try JSONDecoder().decode(LoginResponse.self, from: data)
            if resp.requires_2fa == true, let uid = resp.user_id {
                pendingUserId = uid
                screen = .totp
            } else if let token = resp.access_token {
                APIClient.shared.setAccessToken(token)
                if let rt = resp.refresh_token {
                    UserDefaults.standard.set(rt, forKey: "refresh_token")
                }
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
        struct Body: Encodable { let user_id, code: String }
        struct TokenResponse: Decodable { let access_token: String; let refresh_token: String? }
        do {
            let (data, resp) = try await APIClient.shared.request(
                path: "auth/2fa/verify", method: "POST",
                body: Body(user_id: uid, code: totpCode)
            )
            guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else {
                error = "Invalid code — check Authenticator and try again."
                totpCode = ""
                isLoading = false
                return
            }
            let decoded = try JSONDecoder().decode(TokenResponse.self, from: data)
            APIClient.shared.setAccessToken(decoded.access_token)
            if let rt = decoded.refresh_token {
                UserDefaults.standard.set(rt, forKey: "refresh_token")
            }
        } catch {
            self.error = "Invalid code — check Authenticator and try again."
            totpCode = ""
        }
        isLoading = false
    }
}
