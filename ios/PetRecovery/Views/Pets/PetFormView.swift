import SwiftUI

struct PetFormView: View {
    var onCreated: ((PetDTO) -> Void)?

    @State private var name = ""
    @State private var species = "dog"
    @State private var color = ""
    @State private var size = "medium"
    @State private var isLoading = false
    @State private var errorMessage: String?
    @Environment(\.dismiss) private var dismiss

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
                Picker("Size", selection: $size) {
                    Text("Small").tag("small")
                    Text("Medium").tag("medium")
                    Text("Large").tag("large")
                }
            }

            if let error = errorMessage {
                Section {
                    Text(error).foregroundStyle(.red)
                }
            }

            Section {
                Button("Save Pet") {
                    Task { await savePet() }
                }
                .disabled(isLoading || name.isEmpty || color.isEmpty)
            }
        }
        .navigationTitle("Add Pet")
    }

    private func savePet() async {
        isLoading = true
        errorMessage = nil
        do {
            let response = try await APIClient.shared.createPet(
                name: name,
                species: species,
                color: color,
                size: size
            )
            onCreated?(response.pet)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
