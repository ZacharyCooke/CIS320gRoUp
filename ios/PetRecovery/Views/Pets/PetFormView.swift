import SwiftUI

struct PetFormView: View {
    @State private var name = ""
    @State private var species = "dog"
    @State private var color = ""

    var body: some View {
        Form {
            Section("Pet Profile") {
                TextField("Name", text: $name)
                Picker("Species", selection: $species) {
                    Text("Dog").tag("dog")
                    Text("Cat").tag("cat")
                    Text("Bird").tag("bird")
                    Text("Other").tag("other")
                }
                TextField("Color", text: $color)
            }

            Button("Save Pet") {}
        }
        .navigationTitle("Add Pet")
    }
}
