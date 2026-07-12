import SwiftUI

struct PublicPetProfileView: View {
    let token: String

    @State private var profile: PublicProfileDTO?
    @State private var errorMessage: String?
    @State private var isLoading = true

    private func temperamentStyle(_ value: String, custom: String?) -> (String, Color) {
        switch value {
        case "friendly":    return ("Friendly — safe to approach", .green)
        case "cautious":    return ("Cautious — approach carefully", .orange)
        case "report_only": return ("Report Only — Do Not Approach", .red)
        case "custom":      return (custom?.isEmpty == false ? custom! : "Custom", .gray)
        default:            return (value, .gray)
        }
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView("Loading…")
            } else if let error = errorMessage {
                Text(error).foregroundStyle(.red).padding().accessibilityLabel("Error: \(error)")
            } else if let p = profile {
                content(p)
            }
        }
        .navigationTitle(profile?.name ?? "Pet Profile")
        .task { await load() }
    }

    @ViewBuilder
    private func content(_ p: PublicProfileDTO) -> some View {
        List {
            if p.status == "lost" {
                Section {
                    Text("🐾 THIS PET IS REPORTED LOST — please contact the owner below")
                        .font(.subheadline).fontWeight(.bold)
                        .foregroundStyle(.white)
                        .listRowBackground(Color.red)
                }
            }

            Section {
                LabeledContent("Name", value: p.name)
                LabeledContent("Species", value: p.species.capitalized)
                if let breed = p.breed { LabeledContent("Breed", value: breed) }
                LabeledContent("Color", value: p.color)
                LabeledContent("Size", value: p.size.capitalized)
            }

            Section("Temperament") {
                let (label, color) = temperamentStyle(p.temperament, custom: p.temperament_custom)
                HStack {
                    Image(systemName: "pawprint.fill").foregroundStyle(color)
                    Text(label).foregroundStyle(color).fontWeight(.semibold)
                }
                .accessibilityElement(children: .combine)
                if let notes = p.approach_notes, !notes.isEmpty {
                    Text(notes).font(.callout).foregroundStyle(.secondary)
                }
            }

            if !p.medical_conditions.isEmpty {
                Section("Medical Conditions") {
                    ForEach(p.medical_conditions, id: \.self) { c in
                        Label(c, systemImage: "cross.case")
                    }
                    if let notes = p.medical_emergency_notes, !notes.isEmpty {
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.red)
                            Text(notes).font(.callout)
                        }
                        .accessibilityElement(children: .combine)
                        .accessibilityLabel("Emergency notes: \(notes)")
                    }
                }
            }

            Section("Contact the Owner") {
                if let name = p.owner.name { Text(name).fontWeight(.semibold) }
                if let emailURL = URL(string: "mailto:\(p.owner.email)") {
                    Link(destination: emailURL) {
                        Label(p.owner.email, systemImage: "envelope")
                    }
                    .accessibilityHint("Opens Mail to email the owner")
                } else {
                    Label(p.owner.email, systemImage: "envelope")
                }
                if let phone = p.owner.phone {
                    let normalizedPhone = phone.replacingOccurrences(of: " ", with: "")
                    if let phoneURL = URL(string: "tel:\(normalizedPhone)") {
                        Link(destination: phoneURL) {
                            Label(phone, systemImage: "phone")
                        }
                        .accessibilityHint("Opens Phone to call the owner")
                    } else {
                        Label(phone, systemImage: "phone")
                    }
                }
            }
        }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        do {
            profile = try await APIClient.shared.getPublicProfile(token: token)
        } catch {
            errorMessage = "This pet profile could not be found. The code may be inactive."
        }
        isLoading = false
    }
}
