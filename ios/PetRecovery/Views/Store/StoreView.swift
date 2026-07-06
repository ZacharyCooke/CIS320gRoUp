import StoreKit
import SwiftUI

/// Apple App Store Review Guideline §3.1.1 requires StoreKit (not Stripe) for
/// this digital subscription on iOS. Reward escrow (a peer-to-peer payment for
/// a service) is the only place Stripe is used on this platform.
private let premiumProductID = "app.petrecovery.premium.monthly"

struct StoreView: View {
    @State private var products: [StoreProductDTO] = []
    @State private var isPremium = false
    @State private var isPurchasing = false
    @State private var errorMessage: String?
    @State private var storeKitProduct: Product?

    var body: some View {
        List {
            if !isPremium {
                Section {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Go Premium").bold()
                        Text("Remove ads, unlock unlimited pet profiles, and priority search.")
                            .font(.caption).foregroundStyle(.secondary)
                        Button(isPurchasing ? "Processing…" : "Subscribe") {
                            Task { await purchasePremium() }
                        }
                        .disabled(isPurchasing || storeKitProduct == nil)
                    }
                }
            } else {
                Section { Label("Premium active", systemImage: "checkmark.seal.fill").foregroundStyle(.green) }
            }

            if !isPremium {
                Section { AdBannerView(slot: .banner) }
            }

            if let error = errorMessage {
                Section { Text(error).foregroundStyle(.red) }
            }

            Section("Products") {
                ForEach(products) { product in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(product.name)
                            Text(product.category.replacingOccurrences(of: "_", with: " ").capitalized)
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(String(format: "$%.2f", Double(product.price_cents) / 100))
                            .fontWeight(.semibold)
                    }
                }
            }
        }
        .navigationTitle("Store")
        .task {
            await loadProducts()
            isPremium = await APIClient.shared.isCurrentUserPremium()
            storeKitProduct = try? await Product.products(for: [premiumProductID]).first
        }
    }

    private func loadProducts() async {
        products = (try? await APIClient.shared.getStoreProducts()) ?? []
    }

    private func purchasePremium() async {
        guard let storeKitProduct else { return }
        isPurchasing = true
        errorMessage = nil
        defer { isPurchasing = false }

        do {
            let result = try await storeKitProduct.purchase()
            switch result {
            case .success(let verification):
                guard case .verified = verification else {
                    errorMessage = "Purchase could not be verified."
                    return
                }
                try await APIClient.shared.activateApplePremium()
                isPremium = true
            case .userCancelled:
                break
            case .pending:
                errorMessage = "Purchase is pending approval."
            @unknown default:
                break
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
