import SwiftUI

/// App entry point, gated on auth state. `@AppStorage` observes the same
/// UserDefaults key APIClient writes to, so logging in/out anywhere in the
/// app automatically swaps this view without any extra plumbing.
struct RootView: View {
    @AppStorage("access_token") private var accessToken: String = ""

    var body: some View {
        if accessToken.isEmpty {
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
