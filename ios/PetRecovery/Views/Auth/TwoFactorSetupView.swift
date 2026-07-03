import SwiftUI

struct TwoFactorSetupView: View {
    @State private var qrImageUrl: String?
    @State private var secret: String?
    @State private var code = ""
    @State private var isLoading = true
    @State private var isVerifying = false
    @State private var loadError: String?
    @State private var verifyError: String?
    @State private var enabled = false

    var body: some View {
        NavigationStack {
            Group {
                if enabled {
                    enabledView
                } else if isLoading {
                    ProgressView("Setting up…")
                } else if let error = loadError {
                    Text(error).foregroundStyle(.red).padding()
                } else {
                    setupForm
                }
            }
            .navigationTitle("Two-Factor Auth")
            .task { await loadSetup() }
        }
    }

    private var enabledView: some View {
        VStack(spacing: 20) {
            Image(systemName: "checkmark.shield.fill")
                .font(.system(size: 64))
                .foregroundStyle(.green)
            Text("2FA Enabled")
                .font(.title2).bold()
            Text("Future logins from new devices will require Microsoft Authenticator.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .padding()
    }

    private var setupForm: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Scan this QR code with Microsoft Authenticator, then enter the 6-digit code to confirm.")
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)

                if let urlString = qrImageUrl,
                   let data = Data(base64Encoded: String(urlString.dropFirst("data:image/png;base64,".count))),
                   let uiImage = UIImage(data: data) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .interpolation(.none)
                        .scaledToFit()
                        .frame(width: 200, height: 200)
                        .frame(maxWidth: .infinity)
                        .padding()
                }

                if let sec = secret {
                    DisclosureGroup("Can't scan? Enter manually") {
                        Text(sec)
                            .font(.system(.body, design: .monospaced))
                            .padding()
                            .background(Color(.systemGroupedBackground))
                            .cornerRadius(8)
                            .textSelection(.enabled)
                    }
                    .padding(.horizontal)
                }

                if let error = verifyError {
                    Text(error).foregroundStyle(.red).padding(.horizontal)
                }

                VStack(spacing: 12) {
                    TextField("6-digit code", text: $code)
                        .keyboardType(.numberPad)
                        .textContentType(.oneTimeCode)
                        .multilineTextAlignment(.center)
                        .font(.system(.title3, design: .monospaced))
                        .padding()
                        .background(Color(.systemGroupedBackground))
                        .cornerRadius(10)

                    Button("Enable 2FA") {
                        Task { await verify() }
                    }
                    .disabled(isVerifying || code.count != 6)
                    .buttonStyle(.borderedProminent)
                    .frame(maxWidth: .infinity)
                }
                .padding(.horizontal)
            }
            .padding(.vertical)
        }
    }

    private func loadSetup() async {
        isLoading = true
        do {
            let (data, _) = try await APIClient.shared.request(path: "auth/2fa/setup", method: "POST")
            struct SetupResponse: Decodable {
                let secret: String
                let qr_image_url: String
            }
            let decoded = try JSONDecoder().decode(SetupResponse.self, from: data)
            secret = decoded.secret
            qrImageUrl = decoded.qr_image_url
        } catch {
            loadError = "Could not start 2FA setup — are you logged in?"
        }
        isLoading = false
    }

    private func verify() async {
        isVerifying = true
        verifyError = nil
        struct Body: Encodable { let code: String }
        do {
            let (data, resp) = try await APIClient.shared.request(path: "auth/2fa/verify", method: "POST", body: Body(code: code))
            guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else {
                verifyError = "Invalid code — check Authenticator and try again."
                code = ""
                isVerifying = false
                return
            }
            _ = data
            enabled = true
        } catch {
            verifyError = "Invalid code — check Authenticator and try again."
            code = ""
        }
        isVerifying = false
    }
}
