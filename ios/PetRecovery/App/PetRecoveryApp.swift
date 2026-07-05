import SwiftUI
import UIKit
import UserNotifications

/// Wraps a scanned/deep-linked profile token so it can drive a
/// `navigationDestination(item:)` binding without conforming String itself.
struct ProfileLink: Identifiable, Hashable {
    let token: String
    var id: String { token }
}

/// Bridges UIKit push-notification lifecycle callbacks into the SwiftUI app
/// via `@UIApplicationDelegateAdaptor` — no standalone AppDelegate-driven scene.
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            guard granted, error == nil else { return }
            DispatchQueue.main.async {
                application.registerForRemoteNotifications()
            }
        }
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        Task {
            try? await APIClient.shared.registerPushToken(token)
        }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("[push] registration failed: \(error.localizedDescription)")
    }
}

@main
struct PetRecoveryApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var profileLink: ProfileLink?

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                LoginView()
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
