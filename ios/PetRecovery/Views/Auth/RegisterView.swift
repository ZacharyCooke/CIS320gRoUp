import SwiftUI

struct RegisterView: View {
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var pendingUserId: String?
    @State private var navigateToVerify = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Create Account") {
                    TextField("First name", text: $firstName)
                        .textContentType(.givenName)
                    TextField("Last name", text: $lastName)
                        .textContentType(.familyName)
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()
                    TextField("Phone (optional)", text: $phone)
                        .textContentType(.telephoneNumber)
                        .keyboardType(.phonePad)
                    SecureField("Password (12+ characters)", text: $password)
                        .textContentType(.newPassword)
                }

                if let error = errorMessage {
                    Section {
                        Text(error).foregroundStyle(.red)
                    }
                }

                Section {
                    Button("Register") {
                        Task { await register() }
                    }
                    .disabled(isLoading || email.isEmpty || password.count < 12)
                }
            }
            .navigationTitle("Register")
            .navigationDestination(isPresented: $navigateToVerify) {
                VerifyContactView(userId: pendingUserId ?? "")
            }
        }
    }

    private func register() async {
        isLoading = true
        errorMessage = nil
        do {
            let response = try await APIClient.shared.register(
                firstName: firstName.isEmpty ? nil : firstName,
                lastName: lastName.isEmpty ? nil : lastName,
                email: email,
                password: password,
                phone: phone.isEmpty ? nil : phone
            )
            pendingUserId = response.user_id
            navigateToVerify = true
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
