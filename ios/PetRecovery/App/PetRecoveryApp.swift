import SwiftUI

@main
struct PetRecoveryApp: App {
    var body: some Scene {
        WindowGroup {
            PlaceholderRootView()
        }
    }
}

struct PlaceholderRootView: View {
    var body: some View {
        NavigationView {
            List {
                Text("PetRecovery implementation scaffold")
                Text("Feature screens will be added by user-story tasks.")
            }
            .navigationTitle("PetRecovery")
        }
    }
}
