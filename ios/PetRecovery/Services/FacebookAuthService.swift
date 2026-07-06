import AuthenticationServices
import UIKit

/// Drives the Facebook OAuth consent flow in an ephemeral system browser sheet.
/// The backend's callback redirects to the web dashboard (not a custom URL
/// scheme), so this only detects when the sheet is dismissed and lets the
/// caller re-fetch `/auth/me` to learn whether the connection succeeded.
enum FacebookAuthService {
    private final class PresentationContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
        func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
            UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .flatMap { $0.windows }
                .first { $0.isKeyWindow } ?? ASPresentationAnchor()
        }
    }

    private static var activeSession: ASWebAuthenticationSession?
    private static let contextProvider = PresentationContextProvider()

    static func connect(baseURL: URL, accessToken: String, completion: @escaping () -> Void) {
        var components = URLComponents(url: baseURL.appendingPathComponent("auth/facebook"), resolvingAgainstBaseURL: false)
        components?.queryItems = [URLQueryItem(name: "access_token", value: accessToken)]
        guard let url = components?.url else {
            completion()
            return
        }

        // No custom callback scheme is registered server-side for this flow (see note above);
        // "petrecovery" here only satisfies the API's non-optional callbackURLScheme requirement.
        let session = ASWebAuthenticationSession(url: url, callbackURLScheme: "petrecovery") { _, _ in
            completion()
        }
        session.presentationContextProvider = contextProvider
        session.prefersEphemeralWebBrowserSession = false
        activeSession = session
        session.start()
    }
}
