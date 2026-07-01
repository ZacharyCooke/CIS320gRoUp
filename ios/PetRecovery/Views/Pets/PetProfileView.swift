import SwiftUI

struct PetProfileView: View {
    var body: some View {
        List {
            Section("Profile") {
                Text("Bella")
                Text("Yellow Labrador")
                Text("Friendly")
            }

            Section("Tracking") {
                Button("Link AirTag or Amazon tag") {}
            }

            Section("External Sources") {
                Button("Link found-animal website") {}
            }
        }
        .navigationTitle("Pet Profile")
    }
}
