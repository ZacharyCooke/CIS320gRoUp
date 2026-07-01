import SwiftUI

struct VerifyContactView: View {
    @State private var code = ""

    var body: some View {
        Form {
            Section("Verification Code") {
                TextField("6-digit code", text: $code)
                    .keyboardType(.numberPad)
            }

            Button("Verify & Continue") {}
        }
        .navigationTitle("Verify")
    }
}
