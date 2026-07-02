import SwiftUI

struct PetProfileView: View {
    let pet: PetDTO

    @State private var deviceType = "airtag"
    @State private var shareUrl = ""
    @State private var sourceType = "petfinder_api"
    @State private var statusMessage: String?
    @State private var errorMessage: String?
    @State private var isLinkingDevice = false
    @State private var isLinkingSource = false

    private let sourceNames = ["petfinder_api": "PetFinder", "petfbi_scrape": "PetFBI", "facebook_groups": "Facebook Groups", "manual_link": "Manual link"]
    private let sourceUrls = ["petfinder_api": "https://www.petfinder.com", "petfbi_scrape": "https://www.petfbi.org", "facebook_groups": "https://www.facebook.com", "manual_link": "https://petrecovery.app"]

    var body: some View {
        List {
            Section("Profile") {
                LabeledContent("Name", value: pet.name)
                LabeledContent("Species", value: pet.species)
                LabeledContent("Color", value: pet.color)
                LabeledContent("Status", value: pet.status)
            }

            if let msg = statusMessage {
                Section { Text(msg).foregroundStyle(.green) }
            }
            if let err = errorMessage {
                Section { Text(err).foregroundStyle(.red) }
            }

            Section("Link Tracking Device") {
                Picker("Device type", selection: $deviceType) {
                    Text("AirTag").tag("airtag")
                    Text("Amazon Tag").tag("amazon_tag")
                }
                TextField("Share URL", text: $shareUrl)
                    .keyboardType(.URL)
                    .autocorrectionDisabled()
                Button("Link device") {
                    Task { await linkDevice() }
                }
                .disabled(isLinkingDevice || shareUrl.isEmpty)
            }

            Section("Link External Source") {
                Picker("Source", selection: $sourceType) {
                    Text("PetFinder").tag("petfinder_api")
                    Text("PetFBI").tag("petfbi_scrape")
                    Text("Facebook Groups").tag("facebook_groups")
                    Text("Manual link").tag("manual_link")
                }
                Button("Link source") {
                    Task { await linkSource() }
                }
                .disabled(isLinkingSource)
            }
        }
        .navigationTitle(pet.name)
    }

    private func linkDevice() async {
        isLinkingDevice = true
        statusMessage = nil
        errorMessage = nil
        do {
            try await APIClient.shared.linkTrackingDevice(
                petId: pet.id,
                deviceType: deviceType,
                shareUrl: shareUrl
            )
            statusMessage = "Tracking device linked."
            shareUrl = ""
        } catch {
            errorMessage = error.localizedDescription
        }
        isLinkingDevice = false
    }

    private func linkSource() async {
        isLinkingSource = true
        statusMessage = nil
        errorMessage = nil
        do {
            try await APIClient.shared.linkExternalSource(
                petId: pet.id,
                sourceType: sourceType,
                sourceName: sourceNames[sourceType] ?? sourceType,
                sourceUrl: sourceUrls[sourceType] ?? "https://petrecovery.app"
            )
            statusMessage = "\(sourceNames[sourceType] ?? sourceType) linked."
        } catch {
            errorMessage = error.localizedDescription
        }
        isLinkingSource = false
    }
}
