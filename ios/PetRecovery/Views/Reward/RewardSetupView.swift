import SwiftUI

struct RewardSetupView: View {
    let pet: PetDTO

    @State private var reward: RewardDTO?
    @State private var amountDollars = "50"
    @State private var channel = "paypal"
    @State private var isLoading = true
    @State private var isBusy = false
    @State private var errorMessage: String?

    private let channels = [
        ("paypal", "PayPal"), ("venmo", "Venmo"), ("zelle", "Zelle"), ("cashapp", "Cash App")
    ]

    var body: some View {
        List {
            if let errorMessage {
                Section { Text(errorMessage).foregroundStyle(.red) }
            }

            if isLoading {
                Section { ProgressView() }
            } else if let reward {
                Section("Reward for \(pet.name)") {
                    LabeledContent("Amount", value: String(format: "$%.2f %@", Double(reward.amount_cents) / 100, reward.currency))
                    LabeledContent("Status", value: statusLabel(reward.status))
                }

                if reward.status == "pending_funding" {
                    Section("Confirm funding") {
                        Picker("Sent via", selection: $channel) {
                            ForEach(channels, id: \.0) { value, label in Text(label).tag(value) }
                        }
                        Text("Apple Pay / Google Pay (processed automatically via Stripe) are coming soon — for now, send funds directly and confirm the method here.")
                            .font(.caption).foregroundStyle(.secondary)
                        Button("I've sent the funds") { Task { await fund() } }
                            .disabled(isBusy)
                    }
                }

                if reward.status == "funded" || reward.status == "verification_in_progress" {
                    Section {
                        NavigationLink("Verify & release reward") {
                            ProximityVerificationView(rewardId: reward.id, amountCents: reward.amount_cents)
                        }
                        Button("Cancel reward", role: .destructive) { Task { await cancel() } }
                            .disabled(isBusy || reward.status == "verification_in_progress")
                    }
                }

                if reward.status == "released" {
                    Section { Label("Released to the finder", systemImage: "checkmark.seal.fill").foregroundStyle(.green) }
                }
            } else {
                Section("Set a reward for \(pet.name)") {
                    TextField("Amount (USD)", text: $amountDollars)
                        .keyboardType(.numberPad)
                    Text("Funds are held in escrow and only released once proximity, pet identity, and owner identity are all verified — never on a partial match.")
                        .font(.caption).foregroundStyle(.secondary)
                    Button("Create reward") { Task { await create() } }
                        .disabled(isBusy || Double(amountDollars) == nil)
                }
            }
        }
        .navigationTitle("Reward")
        .task { await load() }
    }

    private func statusLabel(_ status: String) -> String {
        switch status {
        case "pending_funding": return "Awaiting funding"
        case "funded": return "Funded — ready to verify"
        case "verification_in_progress": return "Verification in progress"
        case "released": return "Released"
        case "refunded": return "Refunded"
        case "cancelled": return "Cancelled"
        default: return status
        }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        reward = try? await APIClient.shared.getPetReward(petId: pet.id)
    }

    private func create() async {
        guard let dollars = Double(amountDollars) else { return }
        isBusy = true; errorMessage = nil
        defer { isBusy = false }
        do {
            let response = try await APIClient.shared.createReward(
                petId: pet.id, amountCents: Int(dollars * 100), idempotencyKey: UUID().uuidString
            )
            reward = RewardDTO(
                id: response.reward_id, pet_id: pet.id, amount_cents: response.amount_cents,
                currency: "USD", status: response.status, payment_source: nil, payment_channel: nil
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func fund() async {
        guard let reward else { return }
        isBusy = true; errorMessage = nil
        defer { isBusy = false }
        do {
            let response = try await APIClient.shared.fundReward(
                rewardId: reward.id, paymentChannel: channel, idempotencyKey: UUID().uuidString
            )
            self.reward = RewardDTO(
                id: reward.id, pet_id: reward.pet_id, amount_cents: reward.amount_cents,
                currency: reward.currency, status: response.status,
                payment_source: "manual_confirm", payment_channel: channel
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func cancel() async {
        guard let reward else { return }
        isBusy = true; errorMessage = nil
        defer { isBusy = false }
        do {
            let response = try await APIClient.shared.cancelReward(rewardId: reward.id, idempotencyKey: UUID().uuidString)
            self.reward = RewardDTO(
                id: reward.id, pet_id: reward.pet_id, amount_cents: reward.amount_cents,
                currency: reward.currency, status: response.status,
                payment_source: reward.payment_source, payment_channel: reward.payment_channel
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
