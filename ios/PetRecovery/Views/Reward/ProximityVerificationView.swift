import SwiftUI

struct ProximityVerificationView: View {
    let rewardId: String
    let amountCents: Int

    @State private var verification: ProximityVerificationDTO?
    @State private var role: String?
    @State private var identityMethod = "microchip_read"
    @State private var identityValue = ""
    @State private var isBusy = false
    @State private var errorMessage: String?
    @State private var statusMessage: String?

    private let location = LocationService.shared

    var body: some View {
        List {
            Section {
                Text("All three checks — proximity, pet identity, and owner identity — must pass before the $\(String(format: "%.2f", Double(amountCents) / 100)) reward is released. A partial match never releases funds.")
                    .font(.caption).foregroundStyle(.secondary)
            }

            if let errorMessage {
                Section { Text(errorMessage).foregroundStyle(.red) }
            }
            if let statusMessage {
                Section { Text(statusMessage).foregroundStyle(.teal) }
            }

            if let verification, verification.all_passed {
                Section {
                    Label("All checks passed — the reward has been released.", systemImage: "checkmark.seal.fill")
                        .foregroundStyle(.green)
                }
            } else {
                Section("Verification steps") {
                    checkRow("Proximity (≤ 50 ft)", passed: verification?.proximity_passed ?? false)
                    checkRow("Pet identity", passed: verification?.pet_identity_passed ?? false)
                    checkRow("Owner identity", passed: verification?.owner_identity_passed ?? false)
                }

                if role == nil {
                    Section {
                        Button("I'm the owner") { role = "owner" }
                        Button("I found this pet") { Task { await claimAsFinder() } }
                    }
                }

                if let role, !(verification?.proximity_passed ?? false) {
                    Section {
                        Button("Share my current location") { Task { await submitLocation(role: role) } }
                            .disabled(isBusy)
                    }
                }

                if role == "finder", verification?.proximity_passed == true, verification?.pet_identity_passed == false {
                    Section("Confirm pet identity") {
                        Picker("Method", selection: $identityMethod) {
                            Text("Microchip number").tag("microchip_read")
                            Text("QR code").tag("qr_scan")
                        }
                        TextField("Value", text: $identityValue)
                        Button("Submit") { Task { await submitPetIdentity() } }
                            .disabled(isBusy || identityValue.isEmpty)
                    }
                }

                if role == "owner", verification?.proximity_passed == true, verification?.pet_identity_passed == true,
                   verification?.owner_identity_passed == false {
                    Section {
                        Button("Confirm it's me") { Task { await confirmOwnerIdentity() } }
                            .disabled(isBusy)
                    }
                }
            }
        }
        .navigationTitle("Verify Reward")
        .task { await refresh() }
    }

    @ViewBuilder
    private func checkRow(_ label: String, passed: Bool) -> some View {
        HStack {
            Text(label)
            Spacer()
            Label(passed ? "Passed" : "Pending", systemImage: passed ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(passed ? .green : .secondary)
                .labelStyle(.titleAndIcon)
        }
    }

    private func refresh() async {
        guard let detail = try? await APIClient.shared.getReward(rewardId: rewardId) else { return }
        verification = detail.proximity_verification
    }

    private func claimAsFinder() async {
        isBusy = true; errorMessage = nil
        defer { isBusy = false }
        do {
            try await APIClient.shared.claimRewardAsFinder(rewardId: rewardId)
            role = "finder"
            statusMessage = "You're now verifying as the finder."
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func submitLocation(role: String) async {
        isBusy = true; errorMessage = nil; statusMessage = nil
        defer { isBusy = false }
        location.requestOnceWithAccuracy { coordinate, accuracy in
            Task {
                do {
                    let check = try await APIClient.shared.requestProximityNonce(rewardId: rewardId, role: role)
                    let result = try await APIClient.shared.submitProximity(
                        rewardId: rewardId, role: role,
                        latitude: coordinate.latitude, longitude: coordinate.longitude,
                        accuracyMeters: accuracy, nonce: check.nonce
                    )
                    if result.manual_confirmation_required {
                        statusMessage = "GPS accuracy was too low for an automatic result — a manual confirmation may be needed."
                    } else if result.proximity_passed {
                        statusMessage = "Proximity verified — \(Int(result.distance_feet)) ft apart."
                    } else {
                        statusMessage = "Not close enough yet — \(Int(result.distance_feet)) ft apart (need ≤ 50 ft)."
                    }
                    await refresh()
                } catch {
                    errorMessage = error.localizedDescription
                }
            }
        }
    }

    private func submitPetIdentity() async {
        isBusy = true; errorMessage = nil
        defer { isBusy = false }
        do {
            let response = try await APIClient.shared.submitPetIdentity(rewardId: rewardId, method: identityMethod, value: identityValue)
            statusMessage = response.pet_identity_passed ? "Pet identity confirmed." : "That didn't match — double-check the QR code or microchip number."
            await refresh()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func confirmOwnerIdentity() async {
        isBusy = true; errorMessage = nil
        defer { isBusy = false }
        do {
            _ = try await APIClient.shared.confirmOwnerIdentity(rewardId: rewardId)
            statusMessage = "Owner identity confirmed."
            await refresh()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
