import SwiftUI
import MapKit
import CoreLocation

/// Shows other owners' currently-lost pets near a location, mirroring the
/// web Community Map (CommunityMapPage.tsx) — any logged-in user can browse
/// this, not just the search's owner, gated behind account creation only.
struct CommunityMapView: View {
    /// When arriving from a notification's "View on map" action, centers on
    /// that trigger location immediately instead of requiring fresh GPS.
    var initialCoordinate: CLLocationCoordinate2D?

    private static let radiusOptions: [Double] = [5, 10, 25, 50, 100]

    @State private var region: MKCoordinateRegion?
    @State private var missingPets: [NearbyMissingPetDTO] = []
    @State private var radiusMiles: Double = 25
    @State private var isLoading = false
    @State private var isLocating = false
    @State private var errorMessage: String?
    @State private var selectedPet: NearbyMissingPetDTO?

    var body: some View {
        List {
            Section {
                if let region {
                    Map(
                        coordinateRegion: Binding(get: { region }, set: { self.region = $0 }),
                        annotationItems: missingPets
                    ) { pet in
                        MapAnnotation(coordinate: CLLocationCoordinate2D(latitude: pet.last_seen_lat, longitude: pet.last_seen_lng)) {
                            Button {
                                selectedPet = pet
                            } label: {
                                VStack(spacing: 2) {
                                    Text(speciesEmoji(pet.species))
                                        .font(.title2)
                                        .padding(6)
                                        .background(Color.red.opacity(0.85))
                                        .clipShape(Circle())
                                    Text(pet.name)
                                        .font(.caption2).bold()
                                        .padding(.horizontal, 4)
                                        .background(.white)
                                        .clipShape(Capsule())
                                }
                            }
                            .accessibilityLabel("Missing \(pet.species): \(pet.name), \(String(format: "%.1f", pet.distance_miles)) miles away")
                        }
                    }
                    .frame(height: 300)
                    .listRowInsets(EdgeInsets())
                } else {
                    VStack(spacing: 12) {
                        Image(systemName: "map").font(.system(size: 40)).foregroundStyle(.secondary)
                        Text("See pets reported missing near a location of your choosing.")
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                        Button {
                            locate()
                        } label: {
                            if isLocating {
                                ProgressView()
                            } else {
                                Text("Use My Location")
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(isLocating)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
                }
            }

            if region != nil {
                Section {
                    Picker("Radius", selection: $radiusMiles) {
                        ForEach(Self.radiusOptions, id: \.self) { r in
                            Text("\(Int(r)) mi").tag(r)
                        }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: radiusMiles) { _ in Task { await loadNearby() } }
                }
            }

            if let errorMessage {
                Section {
                    Text(errorMessage).foregroundStyle(.red).accessibilityLabel("Error: \(errorMessage)")
                }
            }

            if region != nil {
                Section("Missing Pets Nearby (\(missingPets.count))") {
                    if isLoading {
                        ProgressView()
                    } else if missingPets.isEmpty {
                        Text("No pets currently reported missing within \(Int(radiusMiles)) miles.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(missingPets) { pet in
                            Button {
                                selectedPet = pet
                            } label: {
                                MissingPetRow(pet: pet)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
        .navigationTitle("Community Map")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    locate()
                } label: {
                    Label("Use My Location", systemImage: "location.fill")
                }
                .disabled(isLocating)
            }
        }
        .sheet(item: $selectedPet) { pet in
            NavigationStack {
                PublicPetProfileView(token: pet.qr_code_token)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Close") { selectedPet = nil }
                        }
                    }
            }
        }
        .task {
            if let initialCoordinate {
                region = MKCoordinateRegion(center: initialCoordinate, latitudinalMeters: 16000, longitudinalMeters: 16000)
                radiusMiles = 5
                await loadNearby()
            }
        }
    }

    private func locate() {
        errorMessage = nil
        isLocating = true
        LocationService.shared.requestOnce { coordinate in
            region = MKCoordinateRegion(center: coordinate, latitudinalMeters: 65000, longitudinalMeters: 65000)
            isLocating = false
            Task { await loadNearby() }
        }
    }

    private func loadNearby() async {
        guard let center = region?.center else { return }
        isLoading = true
        errorMessage = nil
        do {
            let response = try await APIClient.shared.getNearbyMissingPets(
                lat: center.latitude, lng: center.longitude, radiusMiles: radiusMiles
            )
            missingPets = response.missing_pets
        } catch {
            errorMessage = "Could not load nearby pets — please try again."
        }
        isLoading = false
    }
}

private struct MissingPetRow: View {
    let pet: NearbyMissingPetDTO

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            if let urlString = pet.photo_urls.first, let url = URL(string: urlString) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color.gray.opacity(0.15)
                }
                .frame(width: 60, height: 60)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.red.opacity(0.1))
                    .frame(width: 60, height: 60)
                    .overlay(Text(speciesEmoji(pet.species)).font(.title))
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(pet.name).bold()
                Text([pet.species.capitalized, pet.breed, pet.color].compactMap { $0 }.joined(separator: " · "))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if let notes = pet.approach_notes, !notes.isEmpty {
                    Text(notes)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
                Text("\(String(format: "%.1f", pet.distance_miles)) mi away · missing since \(formatDate(pet.started_at))")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Missing \(pet.name), \(pet.species), \(String(format: "%.1f", pet.distance_miles)) miles away. View profile and contact owner.")
    }

    private func formatDate(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: iso) else { return iso }
        let df = DateFormatter()
        df.dateStyle = .medium
        return df.string(from: date)
    }
}
