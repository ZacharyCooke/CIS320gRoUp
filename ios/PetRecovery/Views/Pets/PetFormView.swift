import SwiftUI

struct PetFormView: View {
    var onCreated: ((PetDTO) -> Void)?

    // Basic
    @State private var name = ""
    @State private var species = "dog"
    @State private var breed = ""
    @State private var color = ""
    @State private var size = "medium"
    @State private var microchip = ""

    // Temperament
    @State private var temperament = "friendly"
    @State private var approachNotes = ""

    // Medical
    @State private var conditionInput = ""
    @State private var conditions: [MedicalConditionPayload] = []
    @State private var emergencyNotes = ""
    @State private var shareEmergencyNotes = true

    // Vet
    @State private var vetName = ""
    @State private var vetAddress = ""
    @State private var vetPhone = ""
    @State private var vetEmail = ""

    @State private var isLoading = false
    @State private var errorMessage: String?
    @Environment(\.dismiss) private var dismiss

    private let temperamentOptions = [
        ("friendly", "Friendly — approach freely"),
        ("cautious", "Cautious — approach carefully"),
        ("report_only", "Report Only — do not approach")
    ]

    var body: some View {
        Form {
            Section("Basic Info") {
                TextField("Name", text: $name)
                Picker("Species", selection: $species) {
                    Text("Dog").tag("dog")
                    Text("Cat").tag("cat")
                    Text("Bird").tag("bird")
                    Text("Other").tag("other")
                }
                TextField("Breed (optional)", text: $breed)
                TextField("Color", text: $color)
                Picker("Size", selection: $size) {
                    Text("Small").tag("small")
                    Text("Medium").tag("medium")
                    Text("Large").tag("large")
                }
                TextField("Microchip number (optional)", text: $microchip)
                    .keyboardType(.numberPad)
            }

            Section("Temperament") {
                Picker("Approach behavior", selection: $temperament) {
                    ForEach(temperamentOptions, id: \.0) { value, label in
                        Text(label).tag(value)
                    }
                }
                .pickerStyle(.menu)
                if temperament != "friendly" {
                    TextField("Approach notes", text: $approachNotes, axis: .vertical)
                        .lineLimit(3, reservesSpace: true)
                }
            }

            Section("Medical Conditions") {
                HStack {
                    TextField("Add condition (e.g. Diabetes)", text: $conditionInput)
                    Button("Add") { addCondition() }
                        .disabled(conditionInput.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                ForEach(conditions.indices, id: \.self) { i in
                    HStack {
                        Text(conditions[i].condition)
                        Spacer()
                        Toggle("Public", isOn: Binding(
                            get: { conditions[i].share_publicly },
                            set: { conditions[i] = MedicalConditionPayload(condition: conditions[i].condition, share_publicly: $0) }
                        ))
                        .labelsHidden()
                        .toggleStyle(.switch)
                        .accessibilityLabel("Share \(conditions[i].condition) publicly")
                        .accessibilityHint("Include this condition on the pet's public profile and vet BOLO emails")
                        Text("Share").font(.caption2).foregroundStyle(.secondary)
                    }
                }
                .onDelete { conditions.remove(atOffsets: $0) }

                TextField("Emergency notes (optional)", text: $emergencyNotes, axis: .vertical)
                    .lineLimit(3, reservesSpace: true)
                Toggle("Share emergency notes publicly", isOn: $shareEmergencyNotes)
            }

            Section("Primary Veterinarian") {
                TextField("Clinic name", text: $vetName)
                TextField("Address", text: $vetAddress)
                TextField("Phone", text: $vetPhone).keyboardType(.phonePad)
                TextField("Email", text: $vetEmail).keyboardType(.emailAddress).autocorrectionDisabled()
            }

            if let error = errorMessage {
                Section { Text(error).foregroundStyle(.red).accessibilityLabel("Error: \(error)") }
            }

            Section {
                Button("Save Pet") {
                    Task { await savePet() }
                }
                .disabled(isLoading || name.isEmpty || color.isEmpty)
            }
        }
        .navigationTitle("Add Pet")
    }

    private func addCondition() {
        let trimmed = conditionInput.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        conditions.append(MedicalConditionPayload(condition: trimmed, share_publicly: true))
        conditionInput = ""
    }

    private func savePet() async {
        isLoading = true
        errorMessage = nil
        do {
            let response = try await APIClient.shared.createPet(
                name: name, species: species, color: color, size: size,
                temperament: temperament,
                approachNotes: approachNotes.isEmpty ? nil : approachNotes
            )
            let petId = response.pet.id

            if !conditions.isEmpty || !emergencyNotes.isEmpty {
                try await APIClient.shared.updatePetMedical(
                    petId: petId,
                    conditions: conditions,
                    emergencyNotes: emergencyNotes.isEmpty ? nil : emergencyNotes,
                    shareEmergencyNotes: shareEmergencyNotes
                )
            }

            if !vetName.isEmpty {
                _ = try await APIClient.shared.upsertPetVet(
                    petId: petId,
                    clinicName: vetName,
                    address: vetAddress.isEmpty ? nil : vetAddress,
                    phone: vetPhone.isEmpty ? nil : vetPhone,
                    email: vetEmail.isEmpty ? nil : vetEmail
                )
            }

            onCreated?(response.pet)
            dismiss()
        } catch {
            errorMessage = "Failed to save pet — please try again."
        }
        isLoading = false
    }
}
