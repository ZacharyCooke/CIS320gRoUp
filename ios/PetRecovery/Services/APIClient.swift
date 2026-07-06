import Foundation

final class APIClient {
    static let shared = APIClient()

    let baseURL: URL
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

    func listPets() async throws -> [PetDTO] {
        let (data, _) = try await request(path: "pets")
        struct Response: Decodable { let pets: [PetDTO] }
        return try JSONDecoder().decode(Response.self, from: data).pets
    }

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

    func unlinkTrackingDevice(petId: String, deviceId: String) async throws {
        _ = try await request(path: "pets/\(petId)/tracking-devices/\(deviceId)", method: "DELETE")
    }

    func linkExternalSource(petId: String, sourceType: String, sourceName: String, sourceUrl: String) async throws {
        struct Body: Encodable { let source_type: String; let source_name: String; let source_url: String }
        _ = try await request(path: "pets/\(petId)/external-sources", method: "POST", body: Body(source_type: sourceType, source_name: sourceName, source_url: sourceUrl))
    }

    func unlinkExternalSource(petId: String, sourceId: String) async throws {
        _ = try await request(path: "pets/\(petId)/external-sources/\(sourceId)", method: "DELETE")
    }

    func getPetDetail(petId: String) async throws -> PetDetailDTO {
        let (data, _) = try await request(path: "pets/\(petId)")
        struct Response: Decodable { let pet: PetDetailDTO }
        return try JSONDecoder().decode(Response.self, from: data).pet
    }

    func deletePet(petId: String) async throws {
        _ = try await request(path: "pets/\(petId)", method: "DELETE")
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

    func claimFoundReport(reportId: String, searchId: String) async throws -> ClaimReportResponse {
        struct Body: Encodable { let search_id: String }
        let (data, _) = try await request(path: "found-reports/\(reportId)/claim", method: "POST", body: Body(search_id: searchId))
        return try JSONDecoder().decode(ClaimReportResponse.self, from: data)
    }

    func getVetBolos(searchId: String) async throws -> VetBolosResponse {
        let (data, _) = try await request(path: "searches/\(searchId)/vet-bolos")
        return try JSONDecoder().decode(VetBolosResponse.self, from: data)
    }

    // MARK: - Notifications

    func getNotifications() async throws -> NotificationsListResponse {
        let (data, _) = try await request(path: "notifications")
        return try JSONDecoder().decode(NotificationsListResponse.self, from: data)
    }

    func getNotificationSettings() async throws -> NotificationSettingsDTO {
        let (data, _) = try await request(path: "notifications/settings")
        struct Response: Decodable { let settings: NotificationSettingsDTO }
        return try JSONDecoder().decode(Response.self, from: data).settings
    }

    func updateNotificationSettings(_ settings: NotificationSettingsDTO) async throws {
        _ = try await request(path: "notifications/settings", method: "PATCH", body: settings)
    }

    func markAllNotificationsRead() async {
        _ = try? await request(path: "notifications/read-all", method: "POST")
    }

    func registerDeviceToken(_ token: String) async {
        struct Body: Encodable { let device_token: String }
        _ = try? await request(path: "notifications/device-token", method: "POST", body: Body(device_token: token))
    }

    // MARK: - Rewards

    func createReward(petId: String, amountCents: Int) async throws -> CreateRewardResponse {
        struct Body: Encodable { let pet_id: String; let amount_cents: Int }
        let (data, _) = try await request(path: "rewards", method: "POST", body: Body(pet_id: petId, amount_cents: amountCents))
        return try JSONDecoder().decode(CreateRewardResponse.self, from: data)
    }

    func getReward(rewardId: String) async throws -> RewardDTO {
        let (data, _) = try await request(path: "rewards/\(rewardId)")
        return try JSONDecoder().decode(RewardDTO.self, from: data)
    }

    func fundReward(rewardId: String, paymentSource: String) async throws {
        struct Body: Encodable { let payment_source: String }
        _ = try await request(path: "rewards/\(rewardId)/fund", method: "POST", body: Body(payment_source: paymentSource))
    }

    func cancelReward(rewardId: String) async throws {
        _ = try await request(path: "rewards/\(rewardId)/cancel", method: "POST")
    }

    func issueProximityNonce(rewardId: String, role: String) async throws -> ProximityNonceDTO {
        struct Body: Encodable { let reward_id: String; let role: String }
        let (data, _) = try await request(path: "proximity-check", method: "POST", body: Body(reward_id: rewardId, role: role))
        return try JSONDecoder().decode(ProximityNonceDTO.self, from: data)
    }

    func submitProximityCoordinates(
        rewardId: String, role: String, latitude: Double, longitude: Double,
        nonce: String, accuracyMeters: Double?
    ) async throws -> ProximityStepResponse {
        struct Body: Encodable {
            let role: String; let latitude: Double; let longitude: Double
            let nonce: String; let accuracy_meters: Double?
        }
        let (data, _) = try await request(path: "rewards/\(rewardId)/proximity", method: "POST",
            body: Body(role: role, latitude: latitude, longitude: longitude, nonce: nonce, accuracy_meters: accuracyMeters))
        return try JSONDecoder().decode(ProximityStepResponse.self, from: data)
    }

    func confirmPetIdentity(rewardId: String, role: String, method: String, token: String) async throws -> ProximityStepResponse {
        struct Body: Encodable { let role: String; let pet_identity_method: String; let pet_identity_token: String }
        let (data, _) = try await request(path: "rewards/\(rewardId)/proximity", method: "POST",
            body: Body(role: role, pet_identity_method: method, pet_identity_token: token))
        return try JSONDecoder().decode(ProximityStepResponse.self, from: data)
    }

    func confirmOwnerIdentity(rewardId: String) async throws -> ProximityStepResponse {
        struct Body: Encodable { let role: String; let confirm_owner_identity: Bool }
        let (data, _) = try await request(path: "rewards/\(rewardId)/proximity", method: "POST",
            body: Body(role: "owner", confirm_owner_identity: true))
        return try JSONDecoder().decode(ProximityStepResponse.self, from: data)
    }

    // MARK: - Store

    func getStoreProducts() async throws -> [StoreProductDTO] {
        let (data, _) = try await request(path: "store/products")
        struct Response: Decodable { let products: [StoreProductDTO] }
        return try JSONDecoder().decode(Response.self, from: data).products
    }

    func activateApplePremium() async throws {
        _ = try await request(path: "store/apple-iap/activate", method: "POST")
    }

    func isCurrentUserPremium() async -> Bool {
        guard let (data, _) = try? await request(path: "auth/me") else { return false }
        struct Response: Decodable { struct User: Decodable { let is_premium: Bool }; let user: User }
        return (try? JSONDecoder().decode(Response.self, from: data))?.user.is_premium ?? false
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

struct TrackingDeviceDTO: Decodable, Identifiable {
    let id: String
    let device_type: String
    let share_url: String
}

struct ExternalSourceDTO: Decodable, Identifiable {
    let id: String
    let source_type: String
    let source_name: String
}

struct PetDetailDTO: Decodable {
    let id: String
    let tracking_devices: [TrackingDeviceDTO]
    let external_sources: [ExternalSourceDTO]
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

struct NotificationsListResponse: Decodable {
    let notifications: [NotificationDTO]
    let unread: Int
}

struct NotificationDTO: Decodable, Identifiable {
    let id: String
    let type: String
    let title: String
    let body: String
    let read: Bool
    let created_at: String
}

struct NotificationSettingsDTO: Codable {
    var pet_update: Bool
    var bolo_alert: Bool
    var community_alert: Bool
    var claim_alert: Bool
}

struct CreateRewardResponse: Decodable {
    let reward_id: String
    let status: String
    let amount_cents: Int
}

struct ProximityVerificationDTO: Decodable {
    let proximity_passed: Bool
    let pet_identity_passed: Bool
    let owner_identity_passed: Bool
    let all_passed: Bool
}

struct RewardDTO: Decodable {
    let reward_id: String
    let pet_id: String
    let amount_cents: Int
    let status: String
    let proximity_verification: ProximityVerificationDTO?
}

struct ProximityNonceDTO: Decodable {
    let nonce: String
    let expires_at: String
}

struct ProximityStepResponse: Decodable {
    let proximity_passed: Bool
    let distance_feet: Double?
    let pet_identity_passed: Bool
    let owner_identity_passed: Bool
    let all_passed: Bool
    let next_step: String
}

struct StoreProductDTO: Decodable, Identifiable {
    let id: String
    let name: String
    let category: String
    let price_cents: Int
    let pet_type: String
}

struct ClaimReportResponse: Decodable {
    let owner_contact: String?
}

struct VetBolosResponse: Decodable {
    let search_id: String
    let vet_bolos: [VetBoloDTO]
    let total: Int
}

struct VetBoloDTO: Decodable, Identifiable {
    let id: String
    let clinic_name: String
    let clinic_address: String?
    let distance_miles: Double
    let email_status: String
    let sent_at: String?
}

struct SearchResultDTO: Decodable {
    let id: String
    let source: String
    let external_id: String?
    let name: String?
    let species: String?
    let breed: String?
    let color: String?
    let photo_url: String?
    let lat: Double?
    let lng: Double?
    let distance_miles: Double?
    let description: String?
    let contact_info: String?
    let source_url: String?
}

private struct EmptyBody: Encodable {}
