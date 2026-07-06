import SwiftUI

private let presetDollars = [50, 100, 250, 500]

private let nativeProviders = [("apple_pay", "Apple Pay"), ("google_pay", "Google Pay")]
private let manualProviders = [("paypal", "PayPal"), ("venmo", "Venmo"), ("zelle", "Zelle"), ("cashapp", "Cash App")]

struct RewardSetupView: View {
    let petId: String
    let petName: String

    @State private var reward: RewardDTO?
    @State private var amountDollars = 100
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var statusMessage: String?

    private var storageKey: String { "reward_pet_\(petId)" }

    var body: some View {
        List {
            if let error = errorMessage {
                Section { Text(error).foregroundStyle(.red) }
            }
            if let status = statusMessage {
                Section { Text(status).foregroundStyle(.green) }
            }

            if let reward {
                Section {
                    LabeledContent("Amount", value: String(format: "$%.2f", Double(reward.amount_cents) / 100))
                    LabeledContent("Status", value: reward.status)
                }

                if reward.status == "pending_funding" {
                    Section("Fund escrow — native") {
                        ForEach(nativeProviders, id: \.0) { key, label in
                            Button(label) { Task { await fund(key) } }
                        }
                    }
                    Section("Fund escrow — manual transfer") {
                        Text("Transfer the amount via the app of your choice, then confirm below.")
                            .font(.caption).foregroundStyle(.secondary)
                        ForEach(manualProviders, id: \.0) { key, label in
                            Button("I've sent funds via \(label)") { Task { await fund(key) } }
                        }
                    }
                }

                if let verification = reward.proximity_verification, reward.status != "pending_funding" {
                    Section("Verification status") {
                        checklistRow("GPS proximity", verification.proximity_passed)
                        checklistRow("Pet identity", verification.pet_identity_passed)
                        checklistRow("Owner identity", verification.owner_identity_passed)
                    }

                    if reward.status == "released" {
                        Section { Text("Reward released to the finder — welcome home!").bold().foregroundStyle(.green) }
                    } else {
                        Section {
                            NavigationLink("Open proximity verification") {
                                ProximityVerificationView(rewardId: reward.reward_id, role: "owner")
                            }
                        }
                    }
                }

                if !["released", "cancelled", "refunded"].contains(reward.status) {
                    Section {
                        Button("Cancel reward", role: .destructive) { Task { await cancel() } }
                            .disabled(reward.status == "verification_in_progress")
                    }
                }
            } else if !isLoading {
                Section {
                    Picker("Amount", selection: $amountDollars) {
                        ForEach(presetDollars, id: \.self) { Text("$\($0)").tag($0) }
                    }
                    .pickerStyle(.segmented)
                    Button("Continue to funding") { Task { await createReward() } }
                }
            }
        }
        .navigationTitle("Reward for \(petName)")
        .task { await loadExistingReward() }
    }

    @ViewBuilder
    private func checklistRow(_ label: String, _ done: Bool) -> some View {
        Label(label, systemImage: done ? "checkmark.circle.fill" : "circle")
            .foregroundStyle(done ? .green : .secondary)
    }

    private func loadExistingReward() async {
        isLoading = true
        if let existingId = UserDefaults.standard.string(forKey: storageKey) {
            reward = try? await APIClient.shared.getReward(rewardId: existingId)
        }
        isLoading = false
    }

    private func createReward() async {
        errorMessage = nil
        do {
            let response = try await APIClient.shared.createReward(petId: petId, amountCents: amountDollars * 100)
            UserDefaults.standard.set(response.reward_id, forKey: storageKey)
            reward = try await APIClient.shared.getReward(rewardId: response.reward_id)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func fund(_ paymentSource: String) async {
        guard let reward else { return }
        errorMessage = nil
        do {
            try await APIClient.shared.fundReward(rewardId: reward.reward_id, paymentSource: paymentSource)
            self.reward = try await APIClient.shared.getReward(rewardId: reward.reward_id)
            statusMessage = "Escrow funded."
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func cancel() async {
        guard let reward else { return }
        errorMessage = nil
        do {
            try await APIClient.shared.cancelReward(rewardId: reward.reward_id)
            UserDefaults.standard.removeObject(forKey: storageKey)
            self.reward = nil
            statusMessage = "Reward cancelled and any escrowed funds refunded."
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
