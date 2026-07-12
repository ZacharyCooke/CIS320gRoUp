import Foundation

final class APIClient: ObservableObject {
    static let shared = APIClient()
    private static let tokenKey = "access_token"
    private static let refreshTokenKey = "refresh_token"

    private let baseURL: URL
    private let session: URLSession

    @Published private(set) var accessToken: String?
    private(set) var refreshToken: String?
    private var refreshTask: Task<Bool, Never>?

    init(
        baseURL: URL = URL(string: "http://localhost:3000/api")!,
        session: URLSession = .shared
    ) {
        self.baseURL = baseURL
        self.session = session
        self.accessToken = KeychainService.read(for: Self.tokenKey)
        self.refreshToken = KeychainService.read(for: Self.refreshTokenKey)
    }

    /// Stores a new access token and, when the caller has one, a new refresh
    /// token. Passing `refreshToken: nil` leaves the stored refresh token
    /// untouched (most callers only ever receive a fresh access token).
    func setTokens(accessToken: String?, refreshToken: String? = nil) {
        self.accessToken = accessToken
        if let accessToken {
            KeychainService.save(accessToken, for: Self.tokenKey)
        } else {
            KeychainService.delete(for: Self.tokenKey)
        }

        if let refreshToken {
            self.refreshToken = refreshToken
            KeychainService.save(refreshToken, for: Self.refreshTokenKey)
        }
    }

    /// Backward-compatible single-token setter; does not touch the refresh token.
    func setAccessToken(_ token: String?) {
        setTokens(accessToken: token)
    }

    /// Logs out locally: clears both tokens from memory and the Keychain.
    /// Does not call the server — use `logout()` in APIClient+Auth for that.
    func clearTokens() {
        accessToken = nil
        refreshToken = nil
        KeychainService.delete(for: Self.tokenKey)
        KeychainService.delete(for: Self.refreshTokenKey)
    }

    /// Exchanges the stored refresh token for a new access/refresh token
    /// pair. Concurrent callers (e.g. several views' requests expiring at
    /// once) share a single in-flight attempt — refresh tokens are single-use
    /// server-side, so firing one per caller would fail all but the first.
    @discardableResult
    func attemptTokenRefresh() async -> Bool {
        if let refreshTask {
            return await refreshTask.value
        }
        let task = Task<Bool, Never> { [weak self] in
            await self?.performTokenRefresh() ?? false
        }
        refreshTask = task
        let result = await task.value
        refreshTask = nil
        return result
    }

    private func performTokenRefresh() async -> Bool {
        guard let refreshToken else { return false }
        struct Body: Encodable { let refresh_token: String }
        struct Response: Decodable { let access_token: String; let refresh_token: String }

        guard let (data, response) = try? await performRequest(
            path: "auth/refresh", method: "POST", queryItems: nil, body: Body(refresh_token: refreshToken)
        ) else {
            clearTokens()
            return false
        }
        guard let http = response as? HTTPURLResponse, http.statusCode == 200,
              let decoded = try? JSONDecoder().decode(Response.self, from: data) else {
            clearTokens()
            return false
        }

        setTokens(accessToken: decoded.access_token, refreshToken: decoded.refresh_token)
        return true
    }

    func request<Body: Encodable>(
        path: String,
        method: String = "GET",
        queryItems: [URLQueryItem]? = nil,
        body: Body? = nil
    ) async throws -> (Data, URLResponse) {
        let (data, response) = try await performRequest(path: path, method: method, queryItems: queryItems, body: body)

        if let http = response as? HTTPURLResponse, http.statusCode == 401, await attemptTokenRefresh() {
            return try await performRequest(path: path, method: method, queryItems: queryItems, body: body)
        }

        return (data, response)
    }

    func request(path: String, method: String = "GET", queryItems: [URLQueryItem]? = nil) async throws -> (Data, URLResponse) {
        try await request(path: path, method: method, queryItems: queryItems, body: Optional<EmptyBody>.none)
    }

    private func performRequest<Body: Encodable>(
        path: String,
        method: String,
        queryItems: [URLQueryItem]?,
        body: Body?
    ) async throws -> (Data, URLResponse) {
        var url = baseURL.appendingPathComponent(path)
        if let queryItems, !queryItems.isEmpty {
            var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
            components.queryItems = queryItems
            url = components.url!
        }
        var request = URLRequest(url: url)
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

    func multipartRequest(
        path: String,
        method: String = "POST",
        fields: [String: String],
        file: MultipartUploadFile? = nil
    ) async throws -> (Data, URLResponse) {
        let (data, response) = try await performMultipartRequest(path: path, method: method, fields: fields, file: file)

        if let http = response as? HTTPURLResponse, http.statusCode == 401, await attemptTokenRefresh() {
            return try await performMultipartRequest(path: path, method: method, fields: fields, file: file)
        }

        return (data, response)
    }

    private func performMultipartRequest(
        path: String,
        method: String,
        fields: [String: String],
        file: MultipartUploadFile?
    ) async throws -> (Data, URLResponse) {
        let boundary = "Boundary-\(UUID().uuidString)"
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = method
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        if let accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }

        var body = Data()
        for (name, value) in fields {
            body.appendMultipartLine("--\(boundary)")
            body.appendMultipartLine("Content-Disposition: form-data; name=\"\(name)\"")
            body.appendMultipartLine("")
            body.appendMultipartLine(value)
        }

        if let file {
            body.appendMultipartLine("--\(boundary)")
            body.appendMultipartLine(
                "Content-Disposition: form-data; name=\"\(file.fieldName)\"; filename=\"\(file.fileName)\""
            )
            body.appendMultipartLine("Content-Type: \(file.mimeType)")
            body.appendMultipartLine("")
            body.append(file.data)
            body.appendMultipartLine("")
        }

        body.appendMultipartLine("--\(boundary)--")
        request.httpBody = body

        return try await session.data(for: request)
    }
}

struct MultipartUploadFile {
    let fieldName: String
    let fileName: String
    let mimeType: String
    let data: Data
}

private extension Data {
    mutating func appendMultipartLine(_ line: String) {
        append(Data(line.utf8))
        append(Data("\r\n".utf8))
    }
}

private struct EmptyBody: Encodable {}
