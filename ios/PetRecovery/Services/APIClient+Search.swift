import Foundation

extension APIClient {
    func markPetLost(petId: String, centerLat: Double, centerLng: Double, radiusMiles: Double) async throws -> MarkLostResponse {
        struct Body: Encodable {
            let center_lat: Double
            let center_lng: Double
            let radius_miles: Double
        }

        let (data, _) = try await request(
            path: "pets/\(petId)/mark-lost",
            method: "POST",
            body: Body(center_lat: centerLat, center_lng: centerLng, radius_miles: radiusMiles)
        )
        return try JSONDecoder().decode(MarkLostResponse.self, from: data)
    }

    func markPetRecovered(petId: String) async throws {
        _ = try await request(path: "pets/\(petId)/mark-recovered", method: "POST")
    }

    func getSearchResults(searchId: String) async throws -> SearchResultsResponse {
        let (data, _) = try await request(path: "searches/\(searchId)/results")
        return try JSONDecoder().decode(SearchResultsResponse.self, from: data)
    }

    func getVetBolos(searchId: String) async throws -> VetBolosResponse {
        let (data, _) = try await request(path: "searches/\(searchId)/vet-bolos")
        return try JSONDecoder().decode(VetBolosResponse.self, from: data)
    }

    func closeSearchAndCleanLocation(searchId: String) async {
        struct Body: Encodable { let status: String }

        _ = try? await request(path: "searches/\(searchId)", method: "PATCH", body: Body(status: "closed"))
    }
}
