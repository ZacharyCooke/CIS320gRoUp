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
                        PetRow(pet: pet)
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
            ToolbarItem(placement: .navigationBarLeading) {
                NavigationLink(destination: CommunityMapView()) {
                    Label("Map", systemImage: "map")
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

private struct PetRow: View {
    let pet: PetDTO

    var body: some View {
        HStack(spacing: 12) {
            if let urlString = pet.photo_urls.first, let url = URL(string: urlString) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color.gray.opacity(0.15)
                }
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            } else {
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.teal.opacity(0.1))
                    .frame(width: 56, height: 56)
                    .overlay(Text(speciesEmoji(pet.species)).font(.title2))
            }

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(pet.name).bold()
                    StatusBadge(status: pet.status)
                }
                Text([pet.breed, pet.color, pet.size.capitalized].compactMap { $0 }.joined(separator: " · "))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if let chip = pet.microchip_number, !chip.isEmpty {
                    Text("Chip: \(chip)")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(pet.name), \(pet.status == "lost" ? "Lost" : "Safe")")
    }
}

private struct StatusBadge: View {
    let status: String

    var body: some View {
        Text(status == "lost" ? "Lost" : "Safe")
            .font(.caption2).bold()
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background((status == "lost" ? Color.red : Color.green).opacity(0.15))
            .foregroundStyle(status == "lost" ? .red : .green)
            .clipShape(Capsule())
    }
}
