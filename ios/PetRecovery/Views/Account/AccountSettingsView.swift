import AuthenticationServices
import SwiftUI

struct UserProfile: Decodable {
    let id: String
    let email: String
    let phone: String?
    let is_email_verified: Bool
    let is_phone_verified: Bool
    let is_2fa_enabled: Bool
    var facebook_connected: Bool
}

// ASWebAuthenticationSession requires its presentation context provider to
// stay alive for the duration of the session — a throwaway local instance
// would be deallocated before the user finishes the Facebook consent screen.
final class FacebookAuthPresentationContext: NSObject, ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        ASPresentationAnchor()
    }
}

struct AccountSettingsView: View {
    @State private var profile: UserProfile?
    @State private var isLoading = true
    @State private var loadError: String?
    @State private var showLogoutConfirm = false
    @State private var facebookBusy = false
    @State private var facebookError: String?
    @State private var facebookContext = FacebookAuthPresentationContext()

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                } else if let error = loadError {
                    Text(error).foregroundStyle(.red).padding()
                } else if let p = profile {
                    settingsContent(p)
                }
            }
            .navigationTitle("Account Settings")
            .task { await loadProfile() }
            .confirmationDialog("Sign out of this device?", isPresented: $showLogoutConfirm, titleVisibility: .visible) {
                Button("Sign Out", role: .destructive) { Task { await logout() } }
                Button("Cancel", role: .cancel) {}
            }
        }
    }

    private func settingsContent(_ p: UserProfile) -> some View {
        List {
            Section("Contact Methods") {
                LabeledContent("Email") {
                    HStack(spacing: 6) {
                        Text(p.email).foregroundStyle(.primary)
                        verifiedBadge(p.is_email_verified)
                    }
                }
                LabeledContent("Phone") {
                    HStack(spacing: 6) {
                        Text(p.phone ?? "Not added").foregroundStyle(p.phone == nil ? .secondary : .primary)
                        if p.phone != nil { verifiedBadge(p.is_phone_verified) }
                    }
                }
            }

            Section("Security") {
                if p.is_2fa_enabled {
                    Label("Two-Factor Authentication is on", systemImage: "checkmark.shield.fill")
                        .foregroundStyle(.green)
                } else {
                    NavigationLink(destination: TwoFactorSetupView()) {
                        Label("Enable Two-Factor Authentication", systemImage: "shield")
                    }
                }
            }

            Section("Facebook") {
                if let facebookError {
                    Text(facebookError).foregroundStyle(.red).font(.caption)
                }
                if p.facebook_connected {
                    Label("Connected", systemImage: "checkmark.circle.fill").foregroundStyle(.green)
                    Button("Disconnect", role: .destructive) { Task { await disconnectFacebook() } }
                        .disabled(facebookBusy)
                } else {
                    Text("Optionally connect Facebook so lost-pet searches also scan groups you've joined. Read-only — never used to log in or post.")
                        .font(.caption).foregroundStyle(.secondary)
                    Button("Connect Facebook") { Task { await connectFacebook() } }
                        .disabled(facebookBusy)
                }
            }

            Section {
                Button("Sign Out", role: .destructive) {
                    showLogoutConfirm = true
                }
            }
        }
    }

    private func connectFacebook() async {
        facebookBusy = true; facebookError = nil
        defer { facebookBusy = false }
        do {
            let url = try await APIClient.shared.connectFacebook()
            _ = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<URL, Error>) in
                let session = ASWebAuthenticationSession(url: url, callbackURLScheme: "petrecovery") { callbackURL, error in
                    if let callbackURL {
                        continuation.resume(returning: callbackURL)
                    } else {
                        continuation.resume(throwing: error ?? URLError(.unknown))
                    }
                }
                session.presentationContextProvider = facebookContext
                session.start()
            }
            profile?.facebook_connected = true
        } catch {
            facebookError = "Failed to connect Facebook."
        }
    }

    private func disconnectFacebook() async {
        facebookBusy = true; facebookError = nil
        defer { facebookBusy = false }
        do {
            try await APIClient.shared.disconnectFacebook()
            profile?.facebook_connected = false
        } catch {
            facebookError = "Failed to disconnect Facebook."
        }
    }

    @ViewBuilder
    private func verifiedBadge(_ verified: Bool) -> some View {
        Text(verified ? "Verified" : "Unverified")
            .font(.caption2)
            .fontWeight(.semibold)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(verified ? Color.green.opacity(0.15) : Color.yellow.opacity(0.2))
            .foregroundStyle(verified ? .green : .orange)
            .clipShape(Capsule())
    }

    private func loadProfile() async {
        isLoading = true
        do {
            let (data, _) = try await APIClient.shared.request(path: "auth/me")
            struct MeResponse: Decodable { let user: UserProfile }
            profile = try JSONDecoder().decode(MeResponse.self, from: data).user
        } catch {
            loadError = "Could not load account — please log in again."
        }
        isLoading = false
    }

    private func logout() async {
        let refreshToken = UserDefaults.standard.string(forKey: "refresh_token")
        if let rt = refreshToken {
            struct Body: Encodable { let refresh_token: String }
            _ = try? await APIClient.shared.request(path: "auth/logout", method: "POST", body: Body(refresh_token: rt))
        }
        APIClient.shared.setAccessToken("")
        UserDefaults.standard.removeObject(forKey: "refresh_token")
    }
}
