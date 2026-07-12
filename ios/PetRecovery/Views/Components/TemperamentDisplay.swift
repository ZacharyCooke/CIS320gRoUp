import SwiftUI

/// Shared display rule for temperament, mirroring the web client's identical
/// special-case in PetProfileSections.tsx/PublicPetProfile.tsx: "custom"
/// shows the owner's own text instead of a fixed label.
func temperamentDisplay(temperament: String, custom: String?) -> (label: String, color: Color) {
    switch temperament {
    case "friendly":    return ("Friendly", .green)
    case "cautious":    return ("Cautious", .orange)
    case "report_only": return ("Report Only — Do Not Approach", .red)
    case "custom":      return (custom?.isEmpty == false ? custom! : "Custom", .gray)
    default:            return (temperament, .gray)
    }
}
