import Foundation

final class APIClient {
    static let shared = APIClient()

    private let baseURL: URL
    private var accessToken: String?
    private let session: URLSession

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

    func request(path: String, method: String = "GET") async throws -> (Data, URLResponse) {
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = method

        if let accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }

        return try await session.data(for: request)
    }
}
