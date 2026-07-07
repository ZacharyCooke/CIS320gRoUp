import SwiftUI

struct DashboardView: View {
    @State private var pets: [PetDTO] = []
    @State private var isLoading = true
    @State private var loadError: String?
    @State private var isAddingPet = false

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if let loadError {
                Text(loadError)
                    .foregroundStyle(.red)
                    .accessibilityLabel("Error: \(loadError)")
            } else if pets.isEmpty {
                Text("No pets yet — add your first pet to get started.")
                    .foregroundStyle(.secondary)
            } else {
                List(pets, id: \.id) { pet in
                    NavigationLink(destination: PetProfileView(pet: pet)) {
                        Label(
                            "\(pet.name) - \(pet.status == "lost" ? "Lost" : "Safe")",
                            systemImage: pet.status == "lost" ? "exclamationmark.triangle.fill" : "pawprint.fill"
                        )
                    }
                }
            }
        }
        .navigationTitle("My Pets")
        .task { await loadPets() }
        .refreshable { await loadPets() }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    isAddingPet = true
                } label: {
                    Label("Add Pet", systemImage: "plus")
                }
            }
        }
        .sheet(isPresented: $isAddingPet) {
            NavigationStack {
                PetFormView { newPet in
                    pets.append(newPet)
                }
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { isAddingPet = false }
                    }
                }
            }
        }
    }

    private func loadPets() async {
        isLoading = true
        loadError = nil
        do {
            pets = try await APIClient.shared.listPets()
        } catch {
            loadError = "Could not load your pets — please try again."
        }
        isLoading = false
    }
}
