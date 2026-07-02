import Foundation

/// Enforces the rule that location data is only written during an active lost-pet search
/// and is erased when the search closes. (T052a / T052b)
final class LocationPrivacyService {
    static let shared = LocationPrivacyService()

    private var activeSearchIds: Set<String> = []

    private init() {}

    func registerActiveSearch(searchId: String) {
        activeSearchIds.insert(searchId)
    }

    func deregisterSearch(searchId: String) {
        activeSearchIds.remove(searchId)
        // Notify the backend to anonymize location data for this search
        Task { await APIClient.shared.closeSearchAndCleanLocation(searchId: searchId) }
    }

    func canWriteLocation(for searchId: String) -> Bool {
        activeSearchIds.contains(searchId)
    }
}
