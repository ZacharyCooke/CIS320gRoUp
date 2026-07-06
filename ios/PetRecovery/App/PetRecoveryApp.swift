import SwiftUI

@main
struct PetRecoveryApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    // `navigationDestination(item:)` needs iOS 17; this app targets 16, so the
    // token and its presentation flag are tracked separately instead.
    @State private var profileToken: String?
    @State private var showProfileLink = false

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                RootView()
                    .navigationDestination(isPresented: $showProfileLink) {
                        if let profileToken {
                            PublicPetProfileView(token: profileToken)
                        }
                    }
            }
            .onOpenURL { url in
                if let token = deepLinkToken(from: url) {
                    profileToken = token
                    showProfileLink = true
                }
            }
            .task {
                PushNotificationService.requestAuthorizationAndRegister()
            }
        }
    }

    /// Resolves both custom-scheme links (petrecovery://p/<token>) and
    /// Universal Links (https://…/p/<token>) to a profile token.
    private func deepLinkToken(from url: URL) -> String? {
        // petrecovery://p/<token> — host is "p", token is first path component
        if url.scheme == "petrecovery", url.host == "p" {
            return url.pathComponents.first { $0 != "/" }
        }
        // Custom scheme without host, or a Universal Link — match /p/<token>
        return extractProfileToken(from: url.absoluteString)
    }
}
