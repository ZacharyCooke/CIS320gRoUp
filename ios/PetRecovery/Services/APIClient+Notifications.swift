import Foundation

extension APIClient {
    func updateNotificationSettings(
        petUpdate: Bool? = nil,
        boloAlert: Bool? = nil,
        nearbyLost: Bool? = nil,
        nearbyFound: Bool? = nil,
        storeAccount: Bool? = nil
    ) async throws {
        struct Body: Encodable {
            let notif_pet_update: Bool?
            let notif_bolo_alert: Bool?
            let notif_nearby_lost: Bool?
            let notif_nearby_found: Bool?
            let notif_store_account: Bool?
        }

        _ = try await request(
            path: "notifications/settings",
            method: "PATCH",
            body: Body(
                notif_pet_update: petUpdate,
                notif_bolo_alert: boloAlert,
                notif_nearby_lost: nearbyLost,
                notif_nearby_found: nearbyFound,
                notif_store_account: storeAccount
            )
        )
    }

    func registerPushToken(_ token: String) async throws {
        struct Body: Encodable { let token: String }

        _ = try await request(path: "notifications/device-token", method: "POST", body: Body(token: token))
    }
}
