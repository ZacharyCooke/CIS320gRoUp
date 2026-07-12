import SwiftUI

struct PetProfileView: View {
    // @State (not `let`) so a successful edit can update what's displayed
    // immediately, without waiting for the caller to reload and re-push.
    @State private var pet: PetDTO

    @State private var vet: VetDTO?
    @State private var deviceType = "airtag"
    @State private var shareUrl = ""
    @State private var selectedSourceKey = PET_SOURCE_OPTIONS[0].key
    @State private var sourceUrlInput = PET_SOURCE_OPTIONS[0].defaultURL
    @State private var linkedSources: [ExternalSourceDTO] = []
    @State private var statusMessage: String?
    @State private var errorMessage: String?
    @State private var isLinkingDevice = false
    @State private var isLinkingSource = false
    @State private var showMarkLost = false
    @State private var showEditForm = false

    init(pet: PetDTO) {
        _pet = State(initialValue: pet)
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
                .accessibilityElement(children: .combine)
                if pet.status != "lost" {
                    Button("Mark as Lost", role: .destructive) { showMarkLost = true }
                } else {
                    NavigationLink("Set Reward") { RewardSetupView(pet: pet) }
                }
            }
            .sheet(isPresented: $showMarkLost) { MarkLostView(pet: pet) }

            Section("Temperament") {
                let (label, color) = temperamentDisplay(temperament: pet.temperament, custom: pet.temperament_custom)
                HStack {
                    Image(systemName: "pawprint.fill").foregroundStyle(color)
                    Text(label).foregroundStyle(color).fontWeight(.semibold)
                }
                .accessibilityElement(children: .combine)
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
                        .accessibilityElement(children: .combine)
                        .accessibilityLabel("Emergency notes: \(notes)")
                    }
                }
            }

            if let v = vet {
                Section("Primary Veterinarian") {
                    Text(v.clinic_name).fontWeight(.semibold)
                    if let addr = v.address { Label(addr, systemImage: "mappin") }
                    if let ph = v.phone {
                        let normalizedPhone = ph.replacingOccurrences(of: " ", with: "")
                        if let phoneURL = URL(string: "tel:\(normalizedPhone)") {
                            Link(destination: phoneURL) {
                                Label(ph, systemImage: "phone")
                            }
                            .accessibilityHint("Opens Phone to call the clinic")
                        } else {
                            Label(ph, systemImage: "phone")
                        }
                    }
                    if let em = v.email {
                        if let emailURL = URL(string: "mailto:\(em)") {
                            Link(destination: emailURL) {
                                Label(em, systemImage: "envelope")
                            }
                            .accessibilityHint("Opens Mail to email the clinic")
                        } else {
                            Label(em, systemImage: "envelope")
                        }
                    }
                }
            }

            if let msg = statusMessage {
                Section { Text(msg).foregroundStyle(.green) }
            }
            if let err = errorMessage {
                Section { Text(err).foregroundStyle(.red).accessibilityLabel("Error: \(err)") }
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

            if !linkedSources.isEmpty {
                Section("Linked Sources") {
                    ForEach(linkedSources) { source in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(source.source_name).fontWeight(.medium)
                                Text(source.source_url).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                            }
                            Spacer()
                            Button("Unlink", role: .destructive) {
                                Task { await unlinkSource(source) }
                            }
                            .font(.caption)
                        }
                    }
                }
            }

            Section("Link External Source") {
                Picker("Source", selection: $selectedSourceKey) {
                    ForEach(PET_SOURCE_OPTIONS) { option in
                        Text(option.label).tag(option.key)
                    }
                }
                .onChange(of: selectedSourceKey) { newKey in
                    sourceUrlInput = PET_SOURCE_OPTIONS.first { $0.key == newKey }?.defaultURL ?? ""
                }
                TextField("Listing URL", text: $sourceUrlInput)
                    .keyboardType(.URL).autocorrectionDisabled()
                Button("Link source") {
                    Task { await linkSource() }
                }
                .disabled(isLinkingSource || sourceUrlInput.isEmpty)
            }
        }
        .navigationTitle(pet.name)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("Edit") { showEditForm = true }
            }
        }
        .sheet(isPresented: $showEditForm) {
            NavigationStack {
                PetFormView(existingPet: pet) { updated in
                    pet = updated
                }
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { showEditForm = false }
                    }
                }
            }
        }
        .task {
            vet = try? await APIClient.shared.getPetVet(petId: pet.id)
            linkedSources = (try? await APIClient.shared.getExternalSources(petId: pet.id)) ?? []
        }
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
        guard let option = PET_SOURCE_OPTIONS.first(where: { $0.key == selectedSourceKey }) else { return }
        isLinkingSource = true
        statusMessage = nil; errorMessage = nil
        do {
            try await APIClient.shared.linkExternalSource(
                petId: pet.id, sourceType: option.dbSourceType,
                sourceName: option.label, sourceUrl: sourceUrlInput
            )
            statusMessage = "\(option.label) linked."
            linkedSources = (try? await APIClient.shared.getExternalSources(petId: pet.id)) ?? linkedSources
        } catch { errorMessage = error.localizedDescription }
        isLinkingSource = false
    }

    private func unlinkSource(_ source: ExternalSourceDTO) async {
        statusMessage = nil; errorMessage = nil
        do {
            try await APIClient.shared.unlinkExternalSource(petId: pet.id, sourceId: source.id)
            linkedSources.removeAll { $0.id == source.id }
            statusMessage = "\(source.source_name) unlinked."
        } catch { errorMessage = error.localizedDescription }
    }
}
