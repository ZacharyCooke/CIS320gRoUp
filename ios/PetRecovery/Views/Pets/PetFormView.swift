import PhotosUI
import SwiftUI
import UIKit

struct PetFormView: View {
    /// Non-nil when editing an existing pet — prefills the form and PUTs
    /// instead of POSTing. Nil means "create a new pet."
    var existingPet: PetDTO? = nil
    var onSaved: ((PetDTO) -> Void)?

    private var isEditMode: Bool { existingPet != nil }

    // Basic
    @State private var name = ""
    @State private var species = "dog"
    @State private var breed = ""
    @State private var color = ""
    @State private var size = "medium"
    @State private var microchip = ""
    @State private var licenseTag = ""

    // Temperament
    @State private var temperament = "friendly"
    @State private var temperamentCustom = ""
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

    // Photo
    @State private var isPhotoPickerPresented = false
    @State private var photoData: Data?
    @State private var photoFileName = "pet-photo.jpg"

    @State private var isLoadingExisting = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var photoUploadWarning: String?
    @Environment(\.dismiss) private var dismiss

    private let temperamentOptions = [
        ("friendly", "Friendly — approach freely"),
        ("cautious", "Cautious — approach carefully"),
        ("report_only", "Report Only — do not approach"),
        ("custom", "Other — describe in your own words")
    ]

    var body: some View {
        Group {
            if isLoadingExisting {
                ProgressView("Loading pet profile…")
            } else {
                form
            }
        }
        .navigationTitle(isEditMode ? "Edit Pet" : "Add Pet")
        .task {
            if let existingPet {
                await loadExisting(existingPet)
            }
        }
        .sheet(isPresented: $isPhotoPickerPresented) {
            PetPhotoPicker(imageData: $photoData, fileName: $photoFileName)
        }
        .alert(
            "Pet Saved",
            isPresented: Binding(
                get: { photoUploadWarning != nil },
                set: { if !$0 { photoUploadWarning = nil } }
            ),
            actions: {
                Button("OK") { dismiss() }
            },
            message: {
                Text(photoUploadWarning ?? "")
            }
        )
    }

    private var form: some View {
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
                TextField("License tag (optional)", text: $licenseTag)
            }

            Section("Photo") {
                Button(photoData == nil ? "Choose Photo" : "Replace Photo") {
                    isPhotoPickerPresented = true
                }
                .accessibilityHint("A clear photo helps match this pet if it's ever lost or found")
                if photoData != nil {
                    LabeledContent("Selected", value: photoFileName)
                    Button("Remove Photo", role: .destructive) {
                        photoData = nil
                    }
                }
            }

            Section("Temperament") {
                Picker("Approach behavior", selection: $temperament) {
                    ForEach(temperamentOptions, id: \.0) { value, label in
                        Text(label).tag(value)
                    }
                }
                .pickerStyle(.menu)
                if temperament == "custom" {
                    TextField("Describe temperament", text: $temperamentCustom, axis: .vertical)
                        .lineLimit(2, reservesSpace: true)
                        .accessibilityHint("Required — your own description shown in place of a fixed temperament label")
                }
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
                Button(isEditMode ? "Save Changes" : "Save Pet") {
                    Task { await savePet() }
                }
                .disabled(isLoading || name.isEmpty || color.isEmpty || (temperament == "custom" && temperamentCustom.trimmingCharacters(in: .whitespaces).isEmpty))
            }
        }
    }

    private func loadExisting(_ pet: PetDTO) async {
        isLoadingExisting = true
        name = pet.name
        species = pet.species
        breed = pet.breed ?? ""
        color = pet.color
        size = pet.size
        microchip = pet.microchip_number ?? ""
        temperament = pet.temperament
        temperamentCustom = pet.temperament_custom ?? ""
        approachNotes = pet.approach_notes ?? ""
        licenseTag = pet.license_tag ?? ""
        conditions = pet.medical_conditions.map { MedicalConditionPayload(condition: $0.condition, share_publicly: $0.share_publicly) }
        emergencyNotes = pet.medical_emergency_notes ?? ""
        shareEmergencyNotes = pet.share_emergency_notes

        if let vet = try? await APIClient.shared.getPetVet(petId: pet.id) {
            vetName = vet.clinic_name
            vetAddress = vet.address ?? ""
            vetPhone = vet.phone ?? ""
            vetEmail = vet.email ?? ""
        }
        isLoadingExisting = false
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
            let response: PetResponse
            if let existingPet {
                response = try await APIClient.shared.updatePet(
                    petId: existingPet.id,
                    name: name, species: species,
                    breed: breed.isEmpty ? nil : breed, color: color, size: size,
                    microchipNumber: microchip.isEmpty ? nil : microchip,
                    licenseTag: licenseTag.isEmpty ? nil : licenseTag,
                    temperament: temperament,
                    temperamentCustom: temperament == "custom" ? temperamentCustom.trimmingCharacters(in: .whitespaces) : nil,
                    approachNotes: approachNotes.isEmpty ? nil : approachNotes
                )
            } else {
                response = try await APIClient.shared.createPet(
                    name: name, species: species,
                    breed: breed.isEmpty ? nil : breed, color: color, size: size,
                    microchipNumber: microchip.isEmpty ? nil : microchip,
                    licenseTag: licenseTag.isEmpty ? nil : licenseTag,
                    temperament: temperament,
                    temperamentCustom: temperament == "custom" ? temperamentCustom.trimmingCharacters(in: .whitespaces) : nil,
                    approachNotes: approachNotes.isEmpty ? nil : approachNotes
                )
            }
            let petId = response.pet.id

            // In edit mode these always sync (so clearing a field actually
            // clears it); in create mode only send them when there's
            // something to save. Mirrors PetFormPage.tsx's same rule.
            if isEditMode || !conditions.isEmpty || !emergencyNotes.isEmpty {
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

            if let photoData {
                do {
                    _ = try await APIClient.shared.multipartRequest(
                        path: "pets/\(petId)/photo",
                        fields: [:],
                        file: MultipartUploadFile(
                            fieldName: "photo",
                            fileName: photoFileName,
                            mimeType: "image/jpeg",
                            data: photoData
                        )
                    )
                } catch {
                    // Pet + medical/vet data already saved successfully — a photo failure
                    // shouldn't block the rest of the flow (degrade gracefully, per rules.md).
                    // Route through an alert rather than dismissing immediately, since the
                    // inline error banner below would never be seen before the sheet closes.
                    onSaved?((try? await APIClient.shared.getPet(petId: petId)) ?? response.pet)
                    photoUploadWarning = "Your pet was saved, but the photo failed to upload. You can add one later from the pet's profile."
                    isLoading = false
                    return
                }
            }

            // Medical/vet/photo updates above aren't reflected in `response.pet`
            // (captured before they ran) — refetch so the caller gets fresh data.
            onSaved?((try? await APIClient.shared.getPet(petId: petId)) ?? response.pet)
            dismiss()
        } catch {
            errorMessage = "Failed to save pet — please try again."
        }
        isLoading = false
    }
}

private struct PetPhotoPicker: UIViewControllerRepresentable {
    @Binding var imageData: Data?
    @Binding var fileName: String
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> PHPickerViewController {
        var configuration = PHPickerConfiguration(photoLibrary: .shared())
        configuration.filter = .images
        configuration.selectionLimit = 1

        let picker = PHPickerViewController(configuration: configuration)
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: PHPickerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    final class Coordinator: NSObject, PHPickerViewControllerDelegate {
        private let parent: PetPhotoPicker

        init(parent: PetPhotoPicker) {
            self.parent = parent
        }

        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            parent.dismiss()

            guard let provider = results.first?.itemProvider,
                  provider.canLoadObject(ofClass: UIImage.self) else {
                return
            }

            let suggestedName = provider.suggestedName ?? "pet-photo"
            provider.loadObject(ofClass: UIImage.self) { object, _ in
                guard let image = object as? UIImage,
                      let data = image.jpegData(compressionQuality: 0.85) else {
                    return
                }

                DispatchQueue.main.async {
                    self.parent.fileName = "\(suggestedName).jpg"
                    self.parent.imageData = data
                }
            }
        }
    }
}
