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

    func register(email: String, password: String, phone: String?) async throws -> RegisterResponse {
        struct Body: Encodable { let email: String; let password: String; let phone: String? }
        let (data, _) = try await request(path: "auth/register", method: "POST", body: Body(email: email, password: password, phone: phone))
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

    func createPet(name: String, species: String, color: String, size: String) async throws -> PetResponse {
        struct Body: Encodable { let name: String; let species: String; let color: String; let size: String }
        let (data, _) = try await request(path: "pets", method: "POST", body: Body(name: name, species: species, color: color, size: size))
        return try JSONDecoder().decode(PetResponse.self, from: data)
    }

    func linkTrackingDevice(petId: String, deviceType: String, shareUrl: String) async throws {
        struct Body: Encodable { let device_type: String; let share_url: String }
        _ = try await request(path: "pets/\(petId)/tracking-devices", method: "POST", body: Body(device_type: deviceType, share_url: shareUrl))
    }

    func linkExternalSource(petId: String, sourceType: String, sourceName: String, sourceUrl: String) async throws {
        struct Body: Encodable { let source_type: String; let source_name: String; let source_url: String }
        _ = try await request(path: "pets/\(petId)/external-sources", method: "POST", body: Body(source_type: sourceType, source_name: sourceName, source_url: sourceUrl))
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
    let status: String
}

private struct EmptyBody: Encodable {}
