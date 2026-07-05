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

    func request(path: String, method: String = "GET") async throws -> (Data, URLResponse) {
        try await request(path: path, method: method, body: Optional<EmptyBody>.none)
    }

    func multipartRequest(
        path: String,
        method: String = "POST",
        fields: [String: String],
        file: MultipartUploadFile? = nil
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
