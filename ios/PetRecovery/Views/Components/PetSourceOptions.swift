import Foundation

/// Mirrors the web client's SOURCE_OPTIONS (pages/pets/profile/constants.ts)
/// field-for-field so both platforms offer the same "Link External Source"
/// choices. Several share the same `dbSourceType` ("manual_link" — no real
/// backend integration for these sites) but need their own `key` for the
/// linked/not-linked UI state, matched against `source_name` like web does.
struct PetSourceOption: Identifiable {
    let key: String
    let label: String
    let dbSourceType: String
    let defaultURL: String

    var id: String { key }
}

let PET_SOURCE_OPTIONS: [PetSourceOption] = [
    PetSourceOption(key: "petfinder_api", label: "PetFinder", dbSourceType: "petfinder_api", defaultURL: "https://www.petfinder.com"),
    PetSourceOption(key: "petfbi_scrape", label: "PetFBI", dbSourceType: "petfbi_scrape", defaultURL: "https://petfbi.org"),
    PetSourceOption(key: "facebook_groups", label: "Facebook Groups", dbSourceType: "facebook_groups", defaultURL: "https://www.facebook.com"),
    PetSourceOption(key: "24petconnect", label: "24PetConnect.com", dbSourceType: "manual_link", defaultURL: "https://24petconnect.com"),
    PetSourceOption(key: "petco_love_lost", label: "Petco Love Lost", dbSourceType: "manual_link", defaultURL: "https://petcolove.org/lost/"),
    PetSourceOption(key: "pawboost", label: "PawBoost", dbSourceType: "manual_link", defaultURL: "https://www.pawboost.com"),
    PetSourceOption(key: "nextdoor", label: "Nextdoor", dbSourceType: "manual_link", defaultURL: "https://nextdoor.com"),
    PetSourceOption(key: "ring_neighbors", label: "Ring Neighbors", dbSourceType: "manual_link", defaultURL: "https://ring.com/neighbors"),
    PetSourceOption(key: "craigslist", label: "Craigslist", dbSourceType: "manual_link", defaultURL: "https://www.craigslist.org"),
    PetSourceOption(key: "manual_link", label: "Manual Link", dbSourceType: "manual_link", defaultURL: "")
]
