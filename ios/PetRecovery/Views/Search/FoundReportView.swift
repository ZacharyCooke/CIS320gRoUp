import CoreLocation
import SwiftUI

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

    var body: some View {
        NavigationStack {
            if submitted {
                VStack(spacing: 20) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(.green)
                    Text("Report Submitted!")
                        .font(.title2).bold()
                    Text("Thank you — your report has been sent to nearby active searches.")
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                    Button("Submit Another") { submitted = false }
                }
                .padding()
                .navigationTitle("Found Pet Report")
            } else {
                Form {
                    Section("Your Contact Info (optional)") {
                        TextField("Your name", text: $reporterName)
                        TextField("Email", text: $reporterEmail)
                            .keyboardType(.emailAddress)
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

                        LabeledContent("Latitude", value: lat.isEmpty ? "—" : lat)
                        LabeledContent("Longitude", value: lng.isEmpty ? "—" : lng)
                    }

                    if let error = errorMessage {
                        Section { Text(error).foregroundStyle(.red) }
                    }

                    Section {
                        Button("Submit Report") {
                            Task { await submit() }
                        }
                        .disabled(isSubmitting || description.isEmpty || lat.isEmpty || lng.isEmpty)
                    }
                }
                .navigationTitle("Report Found Pet")
            }
        }
    }

    private func submit() async {
        guard let latVal = Double(lat), let lngVal = Double(lng) else {
            errorMessage = "Invalid coordinates."
            return
        }
        isSubmitting = true
        errorMessage = nil

        struct Body: Encodable {
            let reporter_name: String?; let reporter_email: String?
            let reporter_phone: String?; let description: String
            let species: String?; let breed: String?; let color: String?
            let lat: Double; let lng: Double
        }

        do {
            _ = try await APIClient.shared.request(
                path: "found-reports", method: "POST",
                body: Body(
                    reporter_name: reporterName.isEmpty ? nil : reporterName,
                    reporter_email: reporterEmail.isEmpty ? nil : reporterEmail,
                    reporter_phone: reporterPhone.isEmpty ? nil : reporterPhone,
                    description: description,
                    species: species.isEmpty ? nil : species,
                    breed: breed.isEmpty ? nil : breed,
                    color: color.isEmpty ? nil : color,
                    lat: latVal, lng: lngVal
                )
            )
            submitted = true
        } catch {
            errorMessage = error.localizedDescription
        }
        isSubmitting = false
    }
}
