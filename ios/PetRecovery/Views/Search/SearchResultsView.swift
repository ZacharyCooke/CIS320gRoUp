import MapKit
import SwiftUI

struct SearchResultsView: View {
    let search: SearchDTO
    let pet: PetDTO

    @State private var results: [SearchResultDTO] = []
    @State private var vetBolos: [VetBoloDTO] = []
    @State private var isComplete = false
    @State private var radiusMiles: Double
    @State private var errorMessage: String?
    @State private var claimMessage: String?
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
            if let claimMessage {
                Section { Text(claimMessage).foregroundStyle(.green) }
            }

            if !vetBolos.isEmpty {
                Section("Vet clinics notified (\(vetBolos.count))") {
                    ForEach(vetBolos) { bolo in
                        VetBoloRow(bolo: bolo)
                    }
                }
            }

            Section("Results") {
                if results.isEmpty {
                    Text("No results yet").foregroundStyle(.secondary)
                } else {
                    ForEach(results, id: \.id) { result in
                        ResultRow(result: result) { reportId in
                            Task { await claimReport(reportId) }
                        }
                    }
                }
            }
        }
        .navigationTitle("Search: \(pet.name)")
        .task {
            await loadResults()
            await loadVetBolos()
        }
    }

    private struct GeoResult: Identifiable {
        let id: String; let lat: Double; let lng: Double
    }

    private var geoResults: [GeoResult] {
        results.compactMap { r in
            guard let lat = r.lat, let lng = r.lng else { return nil }
            return GeoResult(id: r.id, lat: lat, lng: lng)
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

    private func loadVetBolos() async {
        vetBolos = (try? await APIClient.shared.getVetBolos(searchId: search.id).vet_bolos) ?? []
    }

    private func claimReport(_ foundReportId: String) async {
        do {
            let response = try await APIClient.shared.claimFoundReport(reportId: foundReportId, searchId: search.id)
            claimMessage = response.owner_contact.map { "Claimed! The finder was sent your contact info: \($0)" }
                ?? "Claimed! The finder has been notified."
        } catch {
            errorMessage = "Could not claim this report — it may already be claimed."
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
    let onClaim: (String) -> Void

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
            if result.source == "found_report", let reportId = result.external_id {
                Button("This is my pet — claim it") { onClaim(reportId) }
                    .font(.caption)
            }
        }
        .padding(.vertical, 4)
    }
}

private extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}

private struct VetBoloRow: View {
    let bolo: VetBoloDTO

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(bolo.clinic_name).bold()
                if let address = bolo.clinic_address {
                    Text(address).font(.caption).foregroundStyle(.secondary)
                }
                if bolo.distance_miles > 0 {
                    Text(String(format: "%.1f mi away", bolo.distance_miles))
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
            Text(bolo.email_status.capitalized)
                .font(.caption2).fontWeight(.semibold)
                .padding(.horizontal, 8).padding(.vertical, 3)
                .background(statusColor.opacity(0.15))
                .foregroundStyle(statusColor)
                .clipShape(Capsule())
        }
        .padding(.vertical, 2)
    }

    private var statusColor: Color {
        switch bolo.email_status {
        case "sent": return .green
        case "bounced": return .red
        default: return .secondary
        }
    }
}
