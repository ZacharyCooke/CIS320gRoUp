import SwiftUI
import UIKit
import UserNotifications

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
    // `navigationDestination(item:)` needs iOS 17; this app targets 16, so the
    // token and its presentation flag are tracked separately instead.
    @State private var profileToken: String?
    @State private var showProfileLink = false

    var body: some Scene {
        WindowGroup {
            // A deep-linked public profile is presented as a sheet, not a
            // pushed destination, so it never needs an app-wide NavigationStack
            // wrapping RootView. That wrapping previously nested a NavigationStack
            // around MainTabView's TabView (which has its own per-tab
            // NavigationStack), which suppressed every tab's navigation bar
            // and toolbar entirely.
            RootView()
                .sheet(isPresented: $showProfileLink) {
                    if let profileToken {
                        NavigationStack {
                            PublicPetProfileView(token: profileToken)
                                .toolbar {
                                    ToolbarItem(placement: .cancellationAction) {
                                        Button("Close") { showProfileLink = false }
                                    }
                                }
                        }
                    }
                }
                .onOpenURL { url in
                    if let token = deepLinkToken(from: url) {
                        profileToken = token
                        showProfileLink = true
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
