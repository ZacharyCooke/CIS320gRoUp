import SwiftUI

struct DashboardView: View {
    @State private var pets: [PetDTO] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showAddPet = false
    @State private var showScanner = false
    @State private var showFoundReport = false
    @State private var scannedToken: String?
    @State private var showScannedProfile = false

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if let error = errorMessage {
                Text(error).foregroundStyle(.red).padding()
            } else if pets.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "pawprint").font(.system(size: 48)).foregroundStyle(.secondary)
                    Text("No pets yet").foregroundStyle(.secondary)
                    Button("Add your first pet") { showAddPet = true }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(pets) { pet in
                    NavigationLink(value: pet) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(pet.name).bold()
                                Text(pet.species.capitalized).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text(pet.status.uppercased())
                                .font(.caption2).fontWeight(.bold)
                                .padding(.horizontal, 8).padding(.vertical, 3)
                                .background(pet.status == "lost" ? Color.red : Color.teal)
                                .foregroundStyle(.white)
                                .clipShape(Capsule())
                        }
                    }
                }
                .refreshable { await loadPets() }
            }
        }
        .navigationTitle("My Pets")
        .navigationDestination(for: PetDTO.self) { pet in
            PetProfileView(pet: pet)
        }
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button { showScanner = true } label: { Image(systemName: "qrcode.viewfinder") }
                    .accessibilityLabel("Scan QR code")
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button { showFoundReport = true } label: { Image(systemName: "pawprint.circle") }
                    .accessibilityLabel("Report a found pet")
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button { showAddPet = true } label: { Image(systemName: "plus") }
                    .accessibilityLabel("Add pet")
            }
        }
        .sheet(isPresented: $showAddPet) {
            NavigationStack {
                PetFormView(onCreated: { _ in Task { await loadPets() } })
            }
        }
        .sheet(isPresented: $showScanner) {
            QRScannerView(onScanned: { token in
                scannedToken = token
                showScannedProfile = true
            })
        }
        .sheet(isPresented: $showFoundReport) {
            FoundReportView()
        }
        .navigationDestination(isPresented: $showScannedProfile) {
            if let scannedToken {
                PublicPetProfileView(token: scannedToken)
            }
        }
        .task { await loadPets() }
    }

    private func loadPets() async {
        if pets.isEmpty { isLoading = true }
        errorMessage = nil
        do {
            pets = try await APIClient.shared.listPets()
        } catch {
            errorMessage = "Could not load pets."
        }
        isLoading = false
    }
}

extension PetDTO: Hashable, Identifiable {
    static func == (lhs: PetDTO, rhs: PetDTO) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}
