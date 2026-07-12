import SwiftUI

/// App entry point, gated on auth state. Observes APIClient's `@Published
/// accessToken` (Keychain-backed) so logging in/out anywhere in the app
/// automatically swaps this view without any extra plumbing.
struct RootView: View {
    @ObservedObject private var apiClient = APIClient.shared

    var body: some View {
        if apiClient.accessToken == nil {
            LoginView()
        } else {
            MainTabView()
        }
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            NavigationStack {
                DashboardView()
            }
            .tabItem { Label("Pets", systemImage: "pawprint.fill") }

            NotificationsView()
                .tabItem { Label("Notifications", systemImage: "bell.fill") }

            NavigationStack {
                StoreView()
            }
            .tabItem { Label("Store", systemImage: "bag.fill") }

            AccountSettingsView()
                .tabItem { Label("Account", systemImage: "person.fill") }
        }
    }
}
