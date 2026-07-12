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
        if let token = response.access_token {
            setTokens(accessToken: token, refreshToken: response.refresh_token)
        }
        return response
    }

    struct LoginResult: Decodable {
        let access_token: String?
        let refresh_token: String?
        let requires_2fa: Bool?
        let user_id: String?
    }

    func login(email: String, password: String) async throws -> LoginResult {
        struct Body: Encodable { let email: String; let password: String }
        let (data, _) = try await request(path: "auth/login", method: "POST", body: Body(email: email, password: password))
        let result = try JSONDecoder().decode(LoginResult.self, from: data)
        if let token = result.access_token {
            setTokens(accessToken: token, refreshToken: result.refresh_token)
        }
        return result
    }

    /// Returns `true` on success (tokens stored), `false` on an invalid code.
    func verifyTwoFactor(userId: String, code: String) async throws -> Bool {
        struct Body: Encodable { let user_id: String; let code: String }
        struct TokenResponse: Decodable { let access_token: String; let refresh_token: String? }

        let (data, response) = try await request(
            path: "auth/2fa/verify", method: "POST", body: Body(user_id: userId, code: code)
        )
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            return false
        }
        let decoded = try JSONDecoder().decode(TokenResponse.self, from: data)
        setTokens(accessToken: decoded.access_token, refreshToken: decoded.refresh_token)
        return true
    }

    /// Revokes the refresh token server-side, then clears local storage
    /// regardless of whether the network call succeeds.
    func logout() async {
        if let refreshToken {
            struct Body: Encodable { let refresh_token: String }
            _ = try? await request(path: "auth/logout", method: "POST", body: Body(refresh_token: refreshToken))
        }
        clearTokens()
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

    /// Response never reveals whether the email exists — a thrown error here
    /// means the request itself failed (network/validation), not "not found."
    func forgotPassword(email: String) async throws {
        struct Body: Encodable { let email: String }
        _ = try await request(path: "auth/forgot-password", method: "POST", body: Body(email: email))
    }

    /// Throws `APIErrorCode(error: "invalid_or_expired_token")` if the token is bad.
    func resetPassword(token: String, newPassword: String) async throws {
        struct Body: Encodable { let token: String; let new_password: String }
        let (data, response) = try await request(
            path: "auth/reset-password", method: "POST",
            body: Body(token: token, new_password: newPassword)
        )
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            if let decoded = try? JSONDecoder().decode(APIErrorCode.self, from: data) {
                throw decoded
            }
            throw URLError(.badServerResponse)
        }
    }
}
