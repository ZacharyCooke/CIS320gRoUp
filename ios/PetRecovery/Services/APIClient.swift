import Foundation

final class APIClient {
    static let shared = APIClient()

    private let baseURL: URL
    private let session: URLSession

    private(set) var accessToken: String? {
        get { UserDefaults.standard.string(forKey: "access_token") }
        set {
            if let value = newValue {
                UserDefaults.standard.set(value, forKey: "access_token")
            } else {
                UserDefaults.standard.removeObject(forKey: "access_token")
            }
        }
    }

    init(
        baseURL: URL = URL(string: "http://localhost:3000/api")!,
        session: URLSession = .shared
    ) {
        self.baseURL = baseURL
        self.session = session
    }

    func setAccessToken(_ token: String?) {
        accessToken = token
    }

    func request<Body: Encodable>(
        path: String,
        method: String = "GET",
        body: Body? = nil
    ) async throws -> (Data, URLResponse) {
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = method

        if let accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.httpBody = try JSONEncoder().encode(body)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        return try await session.data(for: request)
    }

    // Convenience overload for requests without a body
    func request(path: String, method: String = "GET") async throws -> (Data, URLResponse) {
        try await request(path: path, method: method, body: Optional<EmptyBody>.none)
    }

    // MARK: - Auth

    func register(firstName: String?, lastName: String?, email: String, password: String, phone: String?) async throws -> RegisterResponse {
        struct Body: Encodable {
            let first_name: String?; let last_name: String?
            let email: String; let password: String; let phone: String?
        }
        let (data, _) = try await request(path: "auth/register", method: "POST",
            body: Body(first_name: firstName, last_name: lastName, email: email, password: password, phone: phone))
        return try JSONDecoder().decode(RegisterResponse.self, from: data)
    }

    func verifyContact(userId: String, channel: String, code: String) async throws -> VerifyResponse {
        struct Body: Encodable { let user_id: String; let channel: String; let code: String }
        let (data, _) = try await request(path: "auth/verify-contact", method: "POST", body: Body(user_id: userId, channel: channel, code: code))
        let response = try JSONDecoder().decode(VerifyResponse.self, from: data)
        if let token = response.access_token { setAccessToken(token) }
        return response
    }

    // MARK: - Pets

    func createPet(name: String, species: String, color: String, size: String,
                   temperament: String = "friendly", approachNotes: String? = nil) async throws -> PetResponse {
        struct Body: Encodable {
            let name: String; let species: String; let color: String; let size: String
            let temperament: String; let approach_notes: String?
        }
        let (data, _) = try await request(path: "pets", method: "POST",
            body: Body(name: name, species: species, color: color, size: size,
                       temperament: temperament, approach_notes: approachNotes))
        return try JSONDecoder().decode(PetResponse.self, from: data)
    }

    func updatePetMedical(petId: String, conditions: [MedicalConditionPayload], emergencyNotes: String?, shareEmergencyNotes: Bool = true) async throws {
        struct Body: Encodable {
            let medical_conditions: [MedicalConditionPayload]
            let medical_emergency_notes: String?
            let share_emergency_notes: Bool
        }
        _ = try await request(path: "pets/\(petId)/medical", method: "PATCH",
            body: Body(medical_conditions: conditions, medical_emergency_notes: emergencyNotes, share_emergency_notes: shareEmergencyNotes))
    }

    func upsertPetVet(petId: String, clinicName: String, address: String?, phone: String?, email: String?) async throws -> VetDTO {
        struct Body: Encodable { let clinic_name: String; let address: String?; let phone: String?; let email: String? }
        let (data, _) = try await request(path: "pets/\(petId)/vet", method: "PUT",
            body: Body(clinic_name: clinicName, address: address, phone: phone, email: email))
        struct Response: Decodable { let vet: VetDTO }
        return try JSONDecoder().decode(Response.self, from: data).vet
    }

    func getPetVet(petId: String) async throws -> VetDTO? {
        let (data, _) = try await request(path: "pets/\(petId)/vet")
        struct Response: Decodable { let vet: VetDTO? }
        return try JSONDecoder().decode(Response.self, from: data).vet
    }

    func getPetQR(petId: String) async throws -> QRCodeDTO {
        let (data, _) = try await request(path: "pets/\(petId)/qr")
        return try JSONDecoder().decode(QRCodeDTO.self, from: data)
    }

    func rotatePetQR(petId: String) async throws -> QRCodeDTO {
        let (data, _) = try await request(path: "pets/\(petId)/rotate-qr", method: "POST")
        return try JSONDecoder().decode(QRCodeDTO.self, from: data)
    }

    // MARK: - Public profile (no auth required)

    func getPublicProfile(token: String) async throws -> PublicProfileDTO {
        let (data, _) = try await request(path: "p/\(token)")
        struct Response: Decodable { let profile: PublicProfileDTO }
        return try JSONDecoder().decode(Response.self, from: data).profile
    }

    func linkTrackingDevice(petId: String, deviceType: String, shareUrl: String) async throws {
        struct Body: Encodable { let device_type: String; let share_url: String }
        _ = try await request(path: "pets/\(petId)/tracking-devices", method: "POST", body: Body(device_type: deviceType, share_url: shareUrl))
    }

    func linkExternalSource(petId: String, sourceType: String, sourceName: String, sourceUrl: String) async throws {
        struct Body: Encodable { let source_type: String; let source_name: String; let source_url: String }
        _ = try await request(path: "pets/\(petId)/external-sources", method: "POST", body: Body(source_type: sourceType, source_name: sourceName, source_url: sourceUrl))
    }

    // MARK: - Search

    func markPetLost(petId: String, centerLat: Double, centerLng: Double, radiusMiles: Double) async throws -> MarkLostResponse {
        struct Body: Encodable { let center_lat: Double; let center_lng: Double; let radius_miles: Double }
        let (data, _) = try await request(path: "pets/\(petId)/mark-lost", method: "POST",
            body: Body(center_lat: centerLat, center_lng: centerLng, radius_miles: radiusMiles))
        return try JSONDecoder().decode(MarkLostResponse.self, from: data)
    }

    func markPetRecovered(petId: String) async throws {
        _ = try await request(path: "pets/\(petId)/mark-recovered", method: "POST")
    }

    func getSearchResults(searchId: String) async throws -> SearchResultsResponse {
        let (data, _) = try await request(path: "searches/\(searchId)/results")
        return try JSONDecoder().decode(SearchResultsResponse.self, from: data)
    }

    func closeSearchAndCleanLocation(searchId: String) async {
        struct Body: Encodable { let status: String }
        _ = try? await request(path: "searches/\(searchId)", method: "PATCH", body: Body(status: "closed"))
    }
}

// MARK: - Response types

struct RegisterResponse: Decodable {
    let user_id: String
    let message: String
}

struct VerifyResponse: Decodable {
    let verified: Bool
    let access_token: String?
}

struct PetResponse: Decodable {
    let pet: PetDTO
}

struct PetDTO: Decodable {
    let id: String
    let name: String
    let species: String
    let color: String
    let size: String
    let status: String
    let temperament: String
    let approach_notes: String?
    let medical_conditions: [MedicalConditionDTO]
    let medical_emergency_notes: String?
    let share_emergency_notes: Bool
    let qr_code_token: String
}

struct MedicalConditionDTO: Decodable {
    let condition: String
    let share_publicly: Bool
}

struct MedicalConditionPayload: Encodable {
    let condition: String
    let share_publicly: Bool
}

struct VetDTO: Decodable {
    let id: String
    let clinic_name: String
    let address: String?
    let phone: String?
    let email: String?
}

struct QRCodeDTO: Decodable {
    let token: String
    let profile_url: String
    let png_data_url: String?
}

struct PublicProfileDTO: Decodable {
    let name: String
    let species: String
    let breed: String?
    let color: String
    let size: String
    let photo_urls: [String]
    let status: String
    let temperament: String
    let approach_notes: String?
    let medical_conditions: [String]
    let medical_emergency_notes: String?
    let owner: PublicOwnerDTO

    struct PublicOwnerDTO: Decodable {
        let name: String?
        let email: String
        let phone: String?
    }
}

struct MarkLostResponse: Decodable {
    let search: SearchDTO
}

struct SearchDTO: Decodable {
    let id: String
    let pet_id: String
    let status: String
    let center_lat: Double
    let center_lng: Double
    let radius_miles: Double
}

struct SearchResultsResponse: Decodable {
    let search: SearchDTO
    let results: [SearchResultDTO]
}

struct SearchResultDTO: Decodable {
    let id: String
    let source: String
    let name: String?
    let species: String?
    let breed: String?
    let color: String?
    let photo_url: String?
    let distance_miles: Double?
    let description: String?
    let contact_info: String?
    let source_url: String?
}

private struct EmptyBody: Encodable {}
