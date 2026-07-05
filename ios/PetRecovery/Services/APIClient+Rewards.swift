import Foundation

extension APIClient {
    func getPetReward(petId: String) async throws -> RewardDTO? {
        struct Response: Decodable { let reward: RewardDTO? }

        let (data, _) = try await request(path: "pets/\(petId)/reward")
        return try JSONDecoder().decode(Response.self, from: data).reward
    }

    func createReward(petId: String, amountCents: Int, idempotencyKey: String) async throws -> CreateRewardResponse {
        struct Body: Encodable {
            let pet_id: String
            let amount_cents: Int
            let idempotency_key: String
        }

        let (data, _) = try await request(
            path: "rewards",
            method: "POST",
            body: Body(pet_id: petId, amount_cents: amountCents, idempotency_key: idempotencyKey)
        )
        return try JSONDecoder().decode(CreateRewardResponse.self, from: data)
    }

    func getReward(rewardId: String) async throws -> RewardDetailResponse {
        let (data, _) = try await request(path: "rewards/\(rewardId)")
        return try JSONDecoder().decode(RewardDetailResponse.self, from: data)
    }

    func fundReward(rewardId: String, paymentChannel: String, idempotencyKey: String) async throws -> FundRewardResponse {
        struct Body: Encodable {
            let payment_source: String
            let payment_channel: String
            let idempotency_key: String
        }

        let (data, _) = try await request(
            path: "rewards/\(rewardId)/fund",
            method: "POST",
            body: Body(payment_source: "manual_confirm", payment_channel: paymentChannel, idempotency_key: idempotencyKey)
        )
        return try JSONDecoder().decode(FundRewardResponse.self, from: data)
    }

    func claimRewardAsFinder(rewardId: String) async throws {
        _ = try await request(path: "rewards/\(rewardId)/claim-as-finder", method: "POST")
    }

    func requestProximityNonce(rewardId: String, role: String) async throws -> ProximityCheckResponse {
        struct Body: Encodable {
            let reward_id: String
            let role: String
        }

        let (data, _) = try await request(path: "proximity-check", method: "POST", body: Body(reward_id: rewardId, role: role))
        return try JSONDecoder().decode(ProximityCheckResponse.self, from: data)
    }

    func submitProximity(
        rewardId: String,
        role: String,
        latitude: Double,
        longitude: Double,
        accuracyMeters: Double,
        nonce: String
    ) async throws -> ProximitySubmitResponse {
        struct Body: Encodable {
            let role: String
            let latitude: Double
            let longitude: Double
            let accuracy_meters: Double
            let nonce: String
            let timestamp: String
            let idempotency_key: String
        }

        let timestamp = ISO8601DateFormatter().string(from: Date())
        let (data, _) = try await request(
            path: "rewards/\(rewardId)/proximity",
            method: "POST",
            body: Body(
                role: role,
                latitude: latitude,
                longitude: longitude,
                accuracy_meters: accuracyMeters,
                nonce: nonce,
                timestamp: timestamp,
                idempotency_key: UUID().uuidString
            )
        )
        return try JSONDecoder().decode(ProximitySubmitResponse.self, from: data)
    }

    func submitPetIdentity(rewardId: String, method: String, value: String) async throws -> PetIdentityResponse {
        struct Body: Encodable {
            let method: String
            let value: String
        }

        let (data, _) = try await request(
            path: "rewards/\(rewardId)/pet-identity",
            method: "POST",
            body: Body(method: method, value: value)
        )
        return try JSONDecoder().decode(PetIdentityResponse.self, from: data)
    }

    func confirmOwnerIdentity(rewardId: String) async throws -> OwnerIdentityResponse {
        let (data, _) = try await request(path: "rewards/\(rewardId)/owner-identity", method: "POST")
        return try JSONDecoder().decode(OwnerIdentityResponse.self, from: data)
    }

    func cancelReward(rewardId: String, idempotencyKey: String) async throws -> CancelRewardResponse {
        struct Body: Encodable { let idempotency_key: String }

        let (data, _) = try await request(
            path: "rewards/\(rewardId)/cancel",
            method: "POST",
            body: Body(idempotency_key: idempotencyKey)
        )
        return try JSONDecoder().decode(CancelRewardResponse.self, from: data)
    }
}
