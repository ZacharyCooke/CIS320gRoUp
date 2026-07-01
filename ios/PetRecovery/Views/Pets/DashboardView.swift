import SwiftUI

struct DashboardView: View {
    var body: some View {
        List {
            Label("Bella - Safe", systemImage: "pawprint.fill")
            Label("Milo - Lost", systemImage: "exclamationmark.triangle.fill")
        }
        .navigationTitle("My Pets")
    }
}
