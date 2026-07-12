import SwiftUI

/// Presented as a sheet from LoginView. A pushed NavigationLink chain would
/// need multiple pops to get back to the credentials screen on success —
/// this mirrors LoginView's own credentials/totp state-machine instead, so
/// dismissing the sheet in one step is always enough.
struct ForgotPasswordView: View {
    private enum Step { case requestCode, resetPassword, success }

    @Environment(\.dismiss) private var dismiss
    @State private var step: Step = .requestCode

    @State private var email = ""
    @State private var token = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""

    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                switch step {
                case .requestCode: requestCodeSection
                case .resetPassword: resetPasswordSection
                case .success: successSection
                }
            }
            .navigationTitle("Reset Password")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    @ViewBuilder
    private var requestCodeSection: some View {
        Section {
            TextField("Email", text: $email)
                .keyboardType(.emailAddress)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
        } footer: {
            Text("Enter your account email and we'll send you a link to reset your password.")
        }

        if let errorMessage {
            Section { Text(errorMessage).foregroundStyle(.red).accessibilityLabel("Error: \(errorMessage)") }
        }

        Section {
            Button("Send Reset Link") {
                Task { await requestCode() }
            }
            .disabled(isLoading || email.isEmpty)

            Button("I already have a reset code") {
                errorMessage = nil
                step = .resetPassword
            }
            .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private var resetPasswordSection: some View {
        Section {
            Text("📧 If an account exists for \(email.isEmpty ? "that email" : email), a reset link was sent — it expires in 30 minutes.")
                .foregroundStyle(.secondary)
        }

        Section("Reset Code") {
            TextField("Paste the code from your email", text: $token)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
            SecureField("New password (12+ characters)", text: $newPassword)
                .textContentType(.newPassword)
            SecureField("Confirm new password", text: $confirmPassword)
                .textContentType(.newPassword)
        }

        if let errorMessage {
            Section { Text(errorMessage).foregroundStyle(.red).accessibilityLabel("Error: \(errorMessage)") }
        }

        Section {
            Button("Reset Password") {
                Task { await resetPassword() }
            }
            .disabled(isLoading || token.isEmpty || newPassword.count < 12)
        }
    }

    @ViewBuilder
    private var successSection: some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                Text("✅ Password updated").font(.headline)
                Text("You can now sign in with your new password.")
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 4)
        }
        Section {
            Button("Back to Sign In") { dismiss() }
        }
    }

    private func requestCode() async {
        isLoading = true
        errorMessage = nil
        do {
            try await APIClient.shared.forgotPassword(email: email)
            step = .resetPassword
        } catch {
            errorMessage = "Something went wrong — please try again."
        }
        isLoading = false
    }

    private func resetPassword() async {
        guard newPassword == confirmPassword else {
            errorMessage = "Passwords don't match."
            return
        }
        isLoading = true
        errorMessage = nil
        do {
            try await APIClient.shared.resetPassword(token: token, newPassword: newPassword)
            step = .success
        } catch let apiError as APIErrorCode where apiError.error == "invalid_or_expired_token" {
            errorMessage = "This reset code is invalid or has expired — request a new one."
        } catch {
            errorMessage = "Failed to reset password — please try again."
        }
        isLoading = false
    }
}
