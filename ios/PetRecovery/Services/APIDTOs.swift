import Foundation

/// URLSession doesn't throw on HTTP error statuses (only network failures),
/// so endpoints that need to surface a specific server error code (rather
/// than a generic decode failure) check the status manually and throw this.
struct APIErrorCode: Error, Decodable {
    let error: String
}

struct RegisterResponse: Decodable {
    let user_id: String
    let message: String
}

struct VerifyResponse: Decodable {
    let verified: Bool
    let access_token: String?
    let refresh_token: String?
}

struct PetResponse: Decodable {
    let pet: PetDTO
}

struct PetDTO: Decodable {
    let id: String
    let name: String
    let species: String
    let breed: String?
    let color: String
    let size: String
    let status: String
    let photo_urls: [String]
    let microchip_number: String?
    let license_tag: String?
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
    let lat: Double?
    let lng: Double?
    let distance_miles: Double?
    let description: String?
    let contact_info: String?
    let source_url: String?
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
    let distance_miles: Double?
    let email_status: String
}

struct MeResponse: Decodable {
    let user: MeUserDTO
}

struct MeUserDTO: Decodable {
    let id: String
    let email: String
    let notif_pet_update: Bool
    let notif_bolo_alert: Bool
    let notif_nearby_lost: Bool
    let notif_nearby_found: Bool
    let notif_store_account: Bool
    let is_premium: Bool
}

struct NearbyMissingPetsResponse: Decodable {
    let missing_pets: [NearbyMissingPetDTO]
    let total: Int
}

// last_seen_lat/lng are fuzzed server-side (within ~300ft of the true
// reported location) before ever reaching the client — see search.routes.ts.
struct NearbyMissingPetDTO: Decodable, Identifiable {
    let search_id: String
    let pet_id: String
    let owner_id: String
    let started_at: String
    let name: String
    let species: String
    let breed: String?
    let color: String
    let photo_urls: [String]
    let temperament: String
    let approach_notes: String?
    let qr_code_token: String
    let distance_miles: Double
    let last_seen_lat: Double
    let last_seen_lng: Double
    let tracking_devices: [TrackingDevicePointDTO]

    var id: String { search_id }
}

struct TrackingDevicePointDTO: Decodable, Identifiable {
    let id: String
    let device_type: String
    let share_url: String
    let last_known_latitude: Double
    let last_known_longitude: Double
    let last_updated_at: String?
}

struct RewardDTO: Decodable, Identifiable {
    let id: String
    let pet_id: String
    let amount_cents: Int
    let currency: String
    let status: String
    let payment_source: String?
    let payment_channel: String?
}

struct CreateRewardResponse: Decodable {
    let reward_id: String
    let status: String
    let amount_cents: Int
    let audit_log_ref: String
}

struct RewardDetailResponse: Decodable {
    let reward_id: String
    let pet_id: String
    let amount_cents: Int
    let status: String
    let payment_source: String?
    let payment_channel: String?
    let proximity_verification: ProximityVerificationDTO?
}

struct ProximityVerificationDTO: Decodable {
    let proximity_passed: Bool
    let manual_confirmation_required: Bool
    let pet_identity_passed: Bool
    let owner_identity_passed: Bool
    let all_passed: Bool
}

struct FundRewardResponse: Decodable {
    let status: String
    let audit_log_ref: String
    let stripe_reconciliation_status: String
}

struct ProximityCheckResponse: Decodable {
    let nonce: String
    let expires_at: String
}

struct ProximitySubmitResponse: Decodable {
    let proximity_passed: Bool
    let distance_feet: Double
    let manual_confirmation_required: Bool
    let all_passed: Bool
    let next_step: String
}

struct PetIdentityResponse: Decodable {
    let pet_identity_passed: Bool
    let all_passed: Bool
}

struct OwnerIdentityResponse: Decodable {
    let owner_identity_passed: Bool
    let all_passed: Bool
}

struct CancelRewardResponse: Decodable {
    let status: String
    let refund_initiated: Bool
    let audit_log_ref: String
}
