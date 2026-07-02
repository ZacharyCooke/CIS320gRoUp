import MapKit
import SwiftUI

struct SearchResultsView: View {
    let search: SearchDTO
    let pet: PetDTO

    @State private var results: [SearchResultDTO] = []
    @State private var isComplete = false
    @State private var radiusMiles: Double
    @State private var errorMessage: String?
    @State private var isMarkingRecovered = false
    @Environment(\.dismiss) private var dismiss

    init(search: SearchDTO, pet: PetDTO) {
        self.search = search
        self.pet = pet
        _radiusMiles = State(initialValue: search.radius_miles)
    }

    var region: MKCoordinateRegion {
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: search.center_lat, longitude: search.center_lng),
            latitudinalMeters: search.radius_miles * 1609.34 * 2.2,
            longitudinalMeters: search.radius_miles * 1609.34 * 2.2
        )
    }

    var body: some View {
        List {
            Section {
                Map(coordinateRegion: .constant(region), annotationItems: geoResults) { result in
                    MapMarker(coordinate: CLLocationCoordinate2D(latitude: result.lat, longitude: result.lng))
                }
                .frame(height: 240)
            }

            Section {
                Text(isComplete ? "Search complete — \(results.count) result(s)" : "Searching… \(results.count) so far")
                    .foregroundStyle(isComplete ? .primary : .secondary)

                Slider(value: $radiusMiles, in: 1...500, step: 1)
                Button("Update radius (\(Int(radiusMiles)) mi)") {
                    Task { await updateRadius() }
                }
                Button("Mark \(pet.name) recovered", role: .destructive) {
                    Task { await markRecovered() }
                }
                .disabled(isMarkingRecovered)
            }

            if let error = errorMessage {
                Section { Text(error).foregroundStyle(.red) }
            }

            Section("Results") {
                if results.isEmpty {
                    Text("No results yet").foregroundStyle(.secondary)
                } else {
                    ForEach(results, id: \.id) { result in
                        ResultRow(result: result)
                    }
                }
            }
        }
        .navigationTitle("Search: \(pet.name)")
        .task { await loadResults() }
    }

    private struct GeoResult: Identifiable {
        let id: String; let lat: Double; let lng: Double
    }

    private var geoResults: [GeoResult] {
        results.compactMap { r in
            guard let lat = r.distance_miles.map({ _ in r.distance_miles }), // just need non-nil check
                  let _ = r.source_url else { return nil }
            _ = lat
            return nil
        }
    }

    private func loadResults() async {
        do {
            let response = try await APIClient.shared.getSearchResults(searchId: search.id)
            results = response.results
            isComplete = response.search.status != "active"
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func updateRadius() async {
        struct Body: Encodable { let radius_miles: Double }
        _ = try? await APIClient.shared.request(path: "searches/\(search.id)", method: "PATCH",
            body: Body(radius_miles: radiusMiles))
    }

    private func markRecovered() async {
        isMarkingRecovered = true
        do {
            try await APIClient.shared.markPetRecovered(petId: pet.id)
            LocationPrivacyService.shared.deregisterSearch(searchId: search.id)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isMarkingRecovered = false
    }
}

private struct ResultRow: View {
    let result: SearchResultDTO

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(result.name ?? "Unknown").bold()
                Spacer()
                if let dist = result.distance_miles {
                    Text(String(format: "%.1f mi", dist)).foregroundStyle(.secondary)
                }
            }
            if let detail = [result.species, result.breed, result.color].compactMap({ $0 }).joined(separator: " · ").nilIfEmpty {
                Text(detail).font(.caption).foregroundStyle(.secondary)
            }
            if let desc = result.description {
                Text(desc.prefix(100)).font(.caption2).foregroundStyle(.secondary)
            }
            if let url = result.source_url, let link = URL(string: url) {
                Link("View on \(result.source)", destination: link).font(.caption)
            }
        }
        .padding(.vertical, 4)
    }
}

private extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
