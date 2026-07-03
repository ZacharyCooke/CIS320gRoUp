import SwiftUI

struct PetProfileView: View {
    let pet: PetDTO

    @State private var vet: VetDTO?
    @State private var deviceType = "airtag"
    @State private var shareUrl = ""
    @State private var sourceType = "petfinder_api"
    @State private var statusMessage: String?
    @State private var errorMessage: String?
    @State private var isLinkingDevice = false
    @State private var isLinkingSource = false
    @State private var showMarkLost = false

    private let sourceNames = [
        "petfinder_api": "PetFinder", "petfbi_scrape": "PetFBI",
        "facebook_groups": "Facebook Groups", "manual_link": "Manual link"
    ]
    private let sourceUrls = [
        "petfinder_api": "https://www.petfinder.com", "petfbi_scrape": "https://www.petfbi.org",
        "facebook_groups": "https://www.facebook.com", "manual_link": "https://petrecovery.app"
    ]

    private var temperamentLabel: (String, Color) {
        switch pet.temperament {
        case "friendly":     return ("Friendly", .green)
        case "cautious":     return ("Cautious", .orange)
        case "report_only":  return ("Report Only — Do Not Approach", .red)
        default:             return (pet.temperament, .gray)
        }
    }

    var body: some View {
        List {
            Section("Profile") {
                LabeledContent("Name", value: pet.name)
                LabeledContent("Species", value: pet.species.capitalized)
                LabeledContent("Color", value: pet.color)
                LabeledContent("Size", value: pet.size.capitalized)
                HStack {
                    Text("Status")
                    Spacer()
                    Text(pet.status.uppercased())
                        .font(.caption).fontWeight(.bold)
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(pet.status == "lost" ? Color.red : Color.teal)
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
                if pet.status != "lost" {
                    Button("Mark as Lost", role: .destructive) { showMarkLost = true }
                }
            }
            .sheet(isPresented: $showMarkLost) { MarkLostView(pet: pet) }

            Section("Temperament") {
                let (label, color) = temperamentLabel
                HStack {
                    Image(systemName: "pawprint.fill").foregroundStyle(color)
                    Text(label).foregroundStyle(color).fontWeight(.semibold)
                }
                if let notes = pet.approach_notes, !notes.isEmpty {
                    Text(notes).font(.callout).foregroundStyle(.secondary)
                }
            }

            let publicConditions = pet.medical_conditions.filter { $0.share_publicly }
            if !publicConditions.isEmpty {
                Section("Medical Conditions") {
                    ForEach(publicConditions, id: \.condition) { c in
                        Label(c.condition, systemImage: "cross.case")
                    }
                    if let notes = pet.medical_emergency_notes, !notes.isEmpty, pet.share_emergency_notes {
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.red)
                            Text(notes).font(.callout)
                        }
                    }
                }
            }

            if let v = vet {
                Section("Primary Veterinarian") {
                    Text(v.clinic_name).fontWeight(.semibold)
                    if let addr = v.address { Label(addr, systemImage: "mappin") }
                    if let ph = v.phone {
                        Link(destination: URL(string: "tel:\(ph.replacingOccurrences(of: " ", with: ""))")!) {
                            Label(ph, systemImage: "phone")
                        }
                    }
                    if let em = v.email {
                        Link(destination: URL(string: "mailto:\(em)")!) {
                            Label(em, systemImage: "envelope")
                        }
                    }
                }
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
                    .keyboardType(.URL).autocorrectionDisabled()
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
        .task { vet = try? await APIClient.shared.getPetVet(petId: pet.id) }
    }

    private func linkDevice() async {
        isLinkingDevice = true
        statusMessage = nil; errorMessage = nil
        do {
            try await APIClient.shared.linkTrackingDevice(petId: pet.id, deviceType: deviceType, shareUrl: shareUrl)
            statusMessage = "Tracking device linked."
            shareUrl = ""
        } catch { errorMessage = error.localizedDescription }
        isLinkingDevice = false
    }

    private func linkSource() async {
        isLinkingSource = true
        statusMessage = nil; errorMessage = nil
        do {
            try await APIClient.shared.linkExternalSource(
                petId: pet.id, sourceType: sourceType,
                sourceName: sourceNames[sourceType] ?? sourceType,
                sourceUrl: sourceUrls[sourceType] ?? "https://petrecovery.app"
            )
            statusMessage = "\(sourceNames[sourceType] ?? sourceType) linked."
        } catch { errorMessage = error.localizedDescription }
        isLinkingSource = false
    }
}
