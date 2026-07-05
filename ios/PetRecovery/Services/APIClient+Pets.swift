import Foundation

extension APIClient {
    func listPets() async throws -> [PetDTO] {
        struct PetsResponse: Decodable { let pets: [PetDTO] }
        let (data, _) = try await request(path: "pets")
        return try JSONDecoder().decode(PetsResponse.self, from: data).pets
    }

    func createPet(
        name: String,
        species: String,
        color: String,
        size: String,
        temperament: String = "friendly",
        approachNotes: String? = nil
    ) async throws -> PetResponse {
        struct Body: Encodable {
            let name: String
            let species: String
            let color: String
            let size: String
            let temperament: String
            let approach_notes: String?
        }

        let (data, _) = try await request(
            path: "pets",
            method: "POST",
            body: Body(name: name, species: species, color: color, size: size, temperament: temperament, approach_notes: approachNotes)
        )
        return try JSONDecoder().decode(PetResponse.self, from: data)
    }

    func updatePetMedical(
        petId: String,
        conditions: [MedicalConditionPayload],
        emergencyNotes: String?,
        shareEmergencyNotes: Bool = true
    ) async throws {
        struct Body: Encodable {
            let medical_conditions: [MedicalConditionPayload]
            let medical_emergency_notes: String?
            let share_emergency_notes: Bool
        }

        _ = try await request(
            path: "pets/\(petId)/medical",
            method: "PATCH",
            body: Body(
                medical_conditions: conditions,
                medical_emergency_notes: emergencyNotes,
                share_emergency_notes: shareEmergencyNotes
            )
        )
    }

    func upsertPetVet(petId: String, clinicName: String, address: String?, phone: String?, email: String?) async throws -> VetDTO {
        struct Body: Encodable {
            let clinic_name: String
            let address: String?
            let phone: String?
            let email: String?
        }
        struct Response: Decodable { let vet: VetDTO }

        let (data, _) = try await request(
            path: "pets/\(petId)/vet",
            method: "PUT",
            body: Body(clinic_name: clinicName, address: address, phone: phone, email: email)
        )
        return try JSONDecoder().decode(Response.self, from: data).vet
    }

    func getPetVet(petId: String) async throws -> VetDTO? {
        struct Response: Decodable { let vet: VetDTO? }

        let (data, _) = try await request(path: "pets/\(petId)/vet")
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

    func getPublicProfile(token: String) async throws -> PublicProfileDTO {
        struct Response: Decodable { let profile: PublicProfileDTO }

        let (data, _) = try await request(path: "p/\(token)")
        return try JSONDecoder().decode(Response.self, from: data).profile
    }

    func linkTrackingDevice(petId: String, deviceType: String, shareUrl: String) async throws {
        struct Body: Encodable {
            let device_type: String
            let share_url: String
        }

        _ = try await request(
            path: "pets/\(petId)/tracking-devices",
            method: "POST",
            body: Body(device_type: deviceType, share_url: shareUrl)
        )
    }

    func linkExternalSource(petId: String, sourceType: String, sourceName: String, sourceUrl: String) async throws {
        struct Body: Encodable {
            let source_type: String
            let source_name: String
            let source_url: String
        }

        _ = try await request(
            path: "pets/\(petId)/external-sources",
            method: "POST",
            body: Body(source_type: sourceType, source_name: sourceName, source_url: sourceUrl)
        )
    }
}
