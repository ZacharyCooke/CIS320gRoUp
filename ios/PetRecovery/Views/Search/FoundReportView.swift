import CoreLocation
import PhotosUI
import SwiftUI
import UIKit

struct FoundReportView: View {
    @State private var reporterName = ""
    @State private var reporterEmail = ""
    @State private var reporterPhone = ""
    @State private var description = ""
    @State private var species = ""
    @State private var breed = ""
    @State private var color = ""
    @State private var lat = ""
    @State private var lng = ""
    @State private var isLocating = false
    @State private var isSubmitting = false
    @State private var submitted = false
    @State private var errorMessage: String?
    @State private var isPhotoPickerPresented = false
    @State private var photoData: Data?
    @State private var photoFileName = "found-pet.jpg"

    var body: some View {
        NavigationStack {
            if submitted {
                VStack(spacing: 20) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(.green)
                        .accessibilityHidden(true)
                    Text("Report Submitted!")
                        .font(.title2).bold()
                    Text("Thank you - your report has been sent to nearby active searches.")
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                    Button("Submit Another") {
                        submitted = false
                        photoData = nil
                    }
                }
                .padding()
                .navigationTitle("Found Pet Report")
            } else {
                Form {
                    Section("Your Contact Info") {
                        TextField("Your name", text: $reporterName)
                        TextField("Email", text: $reporterEmail)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        TextField("Phone", text: $reporterPhone)
                            .keyboardType(.phonePad)
                    }

                    Section("About the Pet") {
                        TextField("Description (required)", text: $description, axis: .vertical)
                            .lineLimit(3...6)
                        Picker("Species", selection: $species) {
                            Text("Unknown").tag("")
                            Text("Dog").tag("dog")
                            Text("Cat").tag("cat")
                            Text("Bird").tag("bird")
                            Text("Other").tag("other")
                        }
                        TextField("Breed (e.g. Labrador)", text: $breed)
                        TextField("Color (e.g. golden)", text: $color)
                    }

                    Section("Photo") {
                        Button(photoData == nil ? "Choose Photo" : "Replace Photo") {
                            isPhotoPickerPresented = true
                        }
                        .accessibilityHint("A photo helps the owner identify their pet")
                        if photoData != nil {
                            LabeledContent("Selected", value: photoFileName)
                            Button("Remove Photo", role: .destructive) {
                                photoData = nil
                            }
                        }
                    }

                    Section("Where Was the Pet Found?") {
                        Button("Use my current location") {
                            isLocating = true
                            LocationService.shared.requestOnce { coord in
                                lat = String(format: "%.6f", coord.latitude)
                                lng = String(format: "%.6f", coord.longitude)
                                isLocating = false
                            }
                        }
                        .disabled(isLocating)
                        .accessibilityHint("Fills in the latitude and longitude below using your device's GPS")

                        LabeledContent("Latitude", value: lat.isEmpty ? "-" : lat)
                        LabeledContent("Longitude", value: lng.isEmpty ? "-" : lng)
                    }

                    if let error = errorMessage {
                        Section { Text(error).foregroundStyle(.red).accessibilityLabel("Error: \(error)") }
                    }

                    Section {
                        Button("Submit Report") {
                            Task { await submit() }
                        }
                        .disabled(isSubmitting || description.isEmpty || lat.isEmpty || lng.isEmpty)
                    }
                }
                .navigationTitle("Report Found Pet")
                .sheet(isPresented: $isPhotoPickerPresented) {
                    FoundReportPhotoPicker(imageData: $photoData, fileName: $photoFileName)
                }
            }
        }
    }

    private func submit() async {
        guard Double(lat) != nil, Double(lng) != nil else {
            errorMessage = "Invalid coordinates."
            return
        }

        guard !reporterEmail.isEmpty || !reporterPhone.isEmpty else {
            errorMessage = "Please provide an email or phone number so the owner can contact you."
            return
        }

        isSubmitting = true
        errorMessage = nil

        var fields = [
            "description": description,
            "lat": lat,
            "lng": lng
        ]
        addField("reporter_name", reporterName, to: &fields)
        addField("reporter_email", reporterEmail, to: &fields)
        addField("reporter_phone", reporterPhone, to: &fields)
        addField("species", species, to: &fields)
        addField("breed", breed, to: &fields)
        addField("color", color, to: &fields)

        let file = photoData.map {
            MultipartUploadFile(
                fieldName: "photo",
                fileName: photoFileName,
                mimeType: "image/jpeg",
                data: $0
            )
        }

        do {
            _ = try await APIClient.shared.multipartRequest(
                path: "found-reports",
                fields: fields,
                file: file
            )
            submitted = true
        } catch {
            errorMessage = error.localizedDescription
        }
        isSubmitting = false
    }

    private func addField(_ key: String, _ value: String, to fields: inout [String: String]) {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            fields[key] = trimmed
        }
    }
}

private struct FoundReportPhotoPicker: UIViewControllerRepresentable {
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
        private let parent: FoundReportPhotoPicker

        init(parent: FoundReportPhotoPicker) {
            self.parent = parent
        }

        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            parent.dismiss()

            guard let provider = results.first?.itemProvider,
                  provider.canLoadObject(ofClass: UIImage.self) else {
                return
            }

            let suggestedName = provider.suggestedName ?? "found-pet"
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
