import SwiftUI

/// Wraps a scanned/deep-linked profile token so it can drive a
/// `navigationDestination(item:)` binding without conforming String itself.
struct ProfileLink: Identifiable, Hashable {
    let token: String
    var id: String { token }
}

@main
struct PetRecoveryApp: App {
    @State private var profileLink: ProfileLink?

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                PlaceholderRootView()
                    .navigationDestination(item: $profileLink) { link in
                        PublicPetProfileView(token: link.token)
                    }
            }
            .onOpenURL { url in
                if let token = deepLinkToken(from: url) {
                    profileLink = ProfileLink(token: token)
                }
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

struct PlaceholderRootView: View {
    var body: some View {
        List {
            Text("PetRecovery implementation scaffold")
            Text("Feature screens will be added by user-story tasks.")
        }
        .navigationTitle("PetRecovery")
    }
}
