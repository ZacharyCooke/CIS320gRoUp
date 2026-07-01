import SwiftUI

struct RegisterView: View {
    @State private var email = ""
    @State private var phone = ""
    @State private var password = ""

    var body: some View {
        Form {
            Section("Create Account") {
                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                TextField("Phone", text: $phone)
                    .textContentType(.telephoneNumber)
                SecureField("Password", text: $password)
            }

            Button("Register") {}
        }
        .navigationTitle("Register")
    }
}
