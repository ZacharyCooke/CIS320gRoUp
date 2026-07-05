import MapKit
import SwiftUI

struct MarkLostView: View {
    let pet: PetDTO

    @StateObject private var locationService = LocationService.shared
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 30.2672, longitude: -97.7431),
        latitudinalMeters: 32_187, longitudinalMeters: 32_187
    )
    @State private var radiusMiles: Double = 10
    @State private var isLocating = false
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var createdSearch: SearchDTO?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Search Center") {
                    Map(coordinateRegion: $region)
                        .frame(height: 220)
                        .accessibilityHidden(true)

                    Button("Use my current location") {
                        isLocating = true
                        locationService.requestOnce { coord in
                            region.center = coord
                            isLocating = false
                        }
                    }
                    .disabled(isLocating)
                    .accessibilityHint("Sets the search center to your device's current GPS location")

                    LabeledContent("Latitude", value: String(format: "%.5f", region.center.latitude))
                    LabeledContent("Longitude", value: String(format: "%.5f", region.center.longitude))
                }

                Section("Search Radius") {
                    Slider(value: $radiusMiles, in: 1...500, step: 1)
                        .accessibilityValue("\(Int(radiusMiles)) miles")
                    Text("\(Int(radiusMiles)) miles")
                }

                if let error = errorMessage {
                    Section { Text(error).foregroundStyle(.red).accessibilityLabel("Error: \(error)") }
                }

                Section {
                    Button("Start Search") {
                        Task { await startSearch() }
                    }
                    .disabled(isSubmitting)
                }
            }
            .navigationTitle("Mark \(pet.name) as Lost")
            .navigationDestination(isPresented: Binding(
                get: { createdSearch != nil },
                set: { if !$0 { createdSearch = nil } }
            )) {
                if let search = createdSearch {
                    SearchResultsView(search: search, pet: pet)
                }
            }
        }
    }

    private func startSearch() async {
        isSubmitting = true
        errorMessage = nil
        do {
            let response = try await APIClient.shared.markPetLost(
                petId: pet.id,
                centerLat: region.center.latitude,
                centerLng: region.center.longitude,
                radiusMiles: radiusMiles
            )
            LocationPrivacyService.shared.registerActiveSearch(searchId: response.search.id)
            createdSearch = response.search
        } catch {
            errorMessage = error.localizedDescription
        }
        isSubmitting = false
    }
}
