import CoreLocation
import SwiftUI

struct ProximityVerificationView: View {
    let rewardId: String
    let role: String

    @State private var verification: ProximityVerificationDTO?
    @State private var rewardStatus: String?
    @State private var distanceFeet: Double?
    @State private var identityMethod = "qr_scan"
    @State private var identityToken = ""
    @State private var statusMessage: String?
    @State private var errorMessage: String?
    @State private var pollTask: Task<Void, Never>?

    var body: some View {
        List {
            Section {
                VStack(spacing: 8) {
                    ZStack {
                        Circle()
                            .stroke(ringColor, lineWidth: 10)
                            .frame(width: 160, height: 160)
                        Text(distanceFeet.map { String(format: "%.0f ft", $0) } ?? "—")
                            .font(.title3.bold())
                    }
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(distanceFeet.map { "Distance: \(Int($0)) feet" } ?? "Distance not yet measured")
                    Text("Signed in as: \(role)").foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
            }
            .listRowSeparator(.hidden)

            if let error = errorMessage {
                Section { Text(error).foregroundStyle(.red) }
            }
            if let status = statusMessage {
                Section { Text(status).foregroundStyle(.secondary) }
            }

            Section("3-step checklist") {
                checklistRow("GPS proximity (within 50 ft)", verification?.proximity_passed ?? false)
                checklistRow("Pet identity confirmed", verification?.pet_identity_passed ?? false)
                checklistRow("Owner identity confirmed", verification?.owner_identity_passed ?? false)
            }

            if verification?.all_passed != true {
                Section {
                    Button("Submit my location") { Task { await submitLocation() } }
                }

                if verification?.proximity_passed == true, verification?.pet_identity_passed == false {
                    Section("Confirm pet identity") {
                        Picker("Method", selection: $identityMethod) {
                            Text("QR code token").tag("qr_scan")
                            Text("Microchip number").tag("microchip_read")
                        }
                        TextField(identityMethod == "qr_scan" ? "Scanned QR token" : "Microchip number", text: $identityToken)
                        Button("Confirm") { Task { await submitPetIdentity() } }
                            .disabled(identityToken.isEmpty)
                    }
                }

                if verification?.proximity_passed == true, verification?.pet_identity_passed == true,
                   verification?.owner_identity_passed == false, role == "owner" {
                    Section {
                        Button("Confirm my identity") { Task { await confirmOwnerIdentity() } }
                    }
                }
            }

            if rewardStatus == "released" {
                Section {
                    Text("🎉 All verifications passed — the reward has been released!")
                        .bold().foregroundStyle(.green)
                }
            }
        }
        .navigationTitle("Proximity Verification")
        .task {
            startPolling()
        }
        .onDisappear { pollTask?.cancel() }
    }

    private var ringColor: Color {
        if verification?.proximity_passed == true { return .green }
        if distanceFeet != nil { return .orange }
        return .secondary
    }

    @ViewBuilder
    private func checklistRow(_ label: String, _ done: Bool) -> some View {
        Label(label, systemImage: done ? "checkmark.circle.fill" : "circle")
            .foregroundStyle(done ? .green : .secondary)
    }

    private func startPolling() {
        pollTask = Task {
            while !Task.isCancelled {
                await refresh()
                try? await Task.sleep(nanoseconds: 4_000_000_000)
            }
        }
    }

    private func refresh() async {
        guard let reward = try? await APIClient.shared.getReward(rewardId: rewardId) else { return }
        verification = reward.proximity_verification
        rewardStatus = reward.status
    }

    private func submitLocation() async {
        errorMessage = nil
        statusMessage = "Getting your location…"

        let manager = CLLocationManager()
        if manager.accuracyAuthorization == .reducedAccuracy {
            manager.requestTemporaryFullAccuracyAuthorization(withPurposeKey: "RewardProximityVerification") { _ in }
        }

        LocationService.shared.requestOnce { coordinate in
            Task {
                do {
                    let nonce = try await APIClient.shared.issueProximityNonce(rewardId: rewardId, role: role)
                    let accuracy = manager.location?.horizontalAccuracy
                    let response = try await APIClient.shared.submitProximityCoordinates(
                        rewardId: rewardId, role: role,
                        latitude: coordinate.latitude, longitude: coordinate.longitude,
                        nonce: nonce.nonce, accuracyMeters: accuracy
                    )
                    distanceFeet = response.distance_feet
                    statusMessage = response.proximity_passed
                        ? "Proximity confirmed!"
                        : "Location submitted — waiting on the other party."
                    await refresh()
                } catch {
                    errorMessage = error.localizedDescription
                    statusMessage = nil
                }
            }
        }
    }

    private func submitPetIdentity() async {
        errorMessage = nil
        do {
            _ = try await APIClient.shared.confirmPetIdentity(rewardId: rewardId, role: role, method: identityMethod, token: identityToken)
            statusMessage = "Pet identity confirmed."
            await refresh()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func confirmOwnerIdentity() async {
        errorMessage = nil
        do {
            _ = try await APIClient.shared.confirmOwnerIdentity(rewardId: rewardId)
            statusMessage = "Owner identity confirmed."
            await refresh()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
