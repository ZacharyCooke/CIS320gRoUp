import SwiftUI

struct VerifyContactView: View {
    let userId: String

    @State private var code = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var navigateToDashboard = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Verification Code") {
                    TextField("6-digit code", text: $code)
                        .keyboardType(.numberPad)
                }

                if let error = errorMessage {
                    Section {
                        Text(error).foregroundStyle(.red)
                    }
                }

                Section {
                    Button("Verify & Continue") {
                        Task { await verify() }
                    }
                    .disabled(isLoading || code.count != 6)
                }
            }
            .navigationTitle("Verify")
            .navigationDestination(isPresented: $navigateToDashboard) {
                DashboardView()
            }
        }
    }

    private func verify() async {
        isLoading = true
        errorMessage = nil
        do {
            let response = try await APIClient.shared.verifyContact(
                userId: userId,
                channel: "email",
                code: code
            )
            if response.verified { navigateToDashboard = true }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
