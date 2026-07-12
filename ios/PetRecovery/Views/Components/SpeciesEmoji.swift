import Foundation

/// Matches the web client's SPECIES_EMOJI table (DashboardPage.tsx,
/// CommunityMapPage.tsx) so pet cards look consistent across platforms.
func speciesEmoji(_ species: String) -> String {
    switch species {
    case "dog": return "🐕"
    case "cat": return "🐈"
    case "bird": return "🐦"
    default: return "🐾"
    }
}
