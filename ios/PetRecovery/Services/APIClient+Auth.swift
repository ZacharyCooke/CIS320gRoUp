import Foundation

extension APIClient {
    func register(firstName: String?, lastName: String?, email: String, password: String, phone: String?) async throws -> RegisterResponse {
        struct Body: Encodable {
            let first_name: String?
            let last_name: String?
            let email: String
            let password: String
            let phone: String?
        }

        let (data, _) = try await request(
            path: "auth/register",
            method: "POST",
            body: Body(first_name: firstName, last_name: lastName, email: email, password: password, phone: phone)
        )
        return try JSONDecoder().decode(RegisterResponse.self, from: data)
    }

    func verifyContact(userId: String, channel: String, code: String) async throws -> VerifyResponse {
        struct Body: Encodable {
            let user_id: String
            let channel: String
            let code: String
        }

        let (data, _) = try await request(
            path: "auth/verify-contact",
            method: "POST",
            body: Body(user_id: userId, channel: channel, code: code)
        )
        let response = try JSONDecoder().decode(VerifyResponse.self, from: data)
        if let token = response.access_token { setAccessToken(token) }
        return response
    }

    func getMe() async throws -> MeResponse {
        let (data, _) = try await request(path: "auth/me")
        return try JSONDecoder().decode(MeResponse.self, from: data)
    }

    func connectFacebook() async throws -> URL {
        struct Body: Encodable { let platform: String }
        struct Response: Decodable { let redirect_url: String }

        let (data, _) = try await request(path: "auth/facebook", method: "POST", body: Body(platform: "ios"))
        let response = try JSONDecoder().decode(Response.self, from: data)
        guard let url = URL(string: response.redirect_url) else { throw URLError(.badURL) }
        return url
    }

    func disconnectFacebook() async throws {
        _ = try await request(path: "auth/facebook/disconnect", method: "POST")
    }
}
