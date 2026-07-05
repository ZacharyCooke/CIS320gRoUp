import StoreKit
import SwiftUI

private struct StoreProduct: Identifiable {
    let id: String
    let name: String
    let description: String
    let category: String
    let priceCents: Int
    let originalPriceCents: Int?
    let emoji: String
    let badge: String?
}

// Static catalog mirroring frontend/src/pages/store/StorePage.tsx — FR-034 only
// requires a browsable, filterable grid; there's no Product/Order entity in
// data-model.md, so there's no real inventory or checkout behind these physical
// goods. The Premium tile below is the one real, functional purchase here.
private let storeProducts: [StoreProduct] = [
    StoreProduct(id: "qr-smart-tag", name: "PetRecovery QR Smart Tag",
                 description: "Scannable QR code links directly to your pet's PetRecovery profile.",
                 category: "Pet ID & Tags", priceCents: 1299, originalPriceCents: 1999,
                 emoji: "🏷", badge: "Best Seller"),
    StoreProduct(id: "gps-tracker", name: "Whistle Go Explore GPS Tracker",
                 description: "Real-time GPS and activity monitoring, integrated with PetRecovery.",
                 category: "GPS Trackers", priceCents: 7995, originalPriceCents: nil,
                 emoji: "📡", badge: "PetRecovery Compatible"),
    StoreProduct(id: "airtag-holder", name: "AirTag Collar Holder (3-Pack)",
                 description: "Waterproof silicone holder attaches an Apple AirTag to any collar.",
                 category: "GPS Trackers", priceCents: 1499, originalPriceCents: nil,
                 emoji: "🔖", badge: "New"),
    StoreProduct(id: "engraved-id-tag", name: "Engraved Stainless Steel ID Tag",
                 description: "Custom engraved with pet name, owner phone, and PetRecovery profile URL.",
                 category: "Pet ID & Tags", priceCents: 999, originalPriceCents: nil,
                 emoji: "🪪", badge: "Personalized"),
    StoreProduct(id: "first-aid-kit", name: "Pet First Aid Kit — Compact",
                 description: "Bandages, antiseptic, emergency blanket, and a pet-safe pain relief guide.",
                 category: "Safety Gear", priceCents: 2499, originalPriceCents: nil,
                 emoji: "🩺", badge: "Bundle")
]

// The Premium product ID must exist as an auto-renewable subscription in
// App Store Connect before Product.products(for:) can resolve it — not
// obtainable without a paid Apple Developer account, the same accepted
// limitation as stripe_native reward funding and Facebook group-fetching.
private let premiumProductId = "com.petrecovery.premium.monthly"

@MainActor
private final class PremiumStoreModel: ObservableObject {
    @Published var product: Product?
    @Published var errorMessage: String?
    @Published var isBusy = false

    func loadProduct() async {
        do {
            product = try await Product.products(for: [premiumProductId]).first
        } catch {
            errorMessage = "Could not reach the App Store for Premium pricing."
        }
    }

    func purchase(userId: String, onPurchased: @escaping () -> Void) async {
        guard let product else { return }
        isBusy = true
        errorMessage = nil
        defer { isBusy = false }

        do {
            let accountToken = UUID(uuidString: userId) ?? UUID()
            let result = try await product.purchase(options: [.appAccountToken(accountToken)])
            switch result {
            case .success(let verification):
                switch verification {
                case .verified(let transaction):
                    await transaction.finish()
                    onPurchased()
                case .unverified:
                    errorMessage = "Purchase could not be verified by StoreKit."
                }
            case .userCancelled:
                break
            case .pending:
                errorMessage = "Purchase is pending approval (e.g. Ask to Buy)."
            @unknown default:
                break
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct StoreView: View {
    @State private var isPremium = false
    @State private var isLoadingProfile = true
    @State private var userId: String?
    @State private var selectedCategory: String? = nil
    @StateObject private var premiumStore = PremiumStoreModel()

    private let categories = ["Pet ID & Tags", "GPS Trackers", "Safety Gear"]
    private let columns = [GridItem(.adaptive(minimum: 160), spacing: 14)]

    private var filteredProducts: [StoreProduct] {
        guard let selectedCategory else { return storeProducts }
        return storeProducts.filter { $0.category == selectedCategory }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if !isLoadingProfile {
                    AdBannerView(isPremium: isPremium)
                }

                Text("🛍 PetRecovery Store")
                    .font(.title2).bold()
                Text("Everything you need to keep your pets safe, identified, and easy to find.")
                    .font(.subheadline).foregroundStyle(.secondary)

                categoryPicker

                LazyVGrid(columns: columns, spacing: 14) {
                    ForEach(filteredProducts) { product in
                        productCard(product)
                    }
                }

                premiumCard
            }
            .padding()
        }
        .navigationTitle("Store")
        .task {
            await premiumStore.loadProduct()
            await loadProfile()
        }
    }

    private var categoryPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                categoryChip(label: "All Products", isSelected: selectedCategory == nil) {
                    selectedCategory = nil
                }
                ForEach(categories, id: \.self) { category in
                    categoryChip(label: category, isSelected: selectedCategory == category) {
                        selectedCategory = category
                    }
                }
            }
        }
    }

    private func categoryChip(label: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.caption).bold()
                .padding(.horizontal, 12).padding(.vertical, 6)
                .background(isSelected ? Color.teal : Color(.systemGray5))
                .foregroundStyle(isSelected ? .white : .primary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private func productCard(_ product: StoreProduct) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(product.emoji).font(.system(size: 40)).frame(maxWidth: .infinity, alignment: .center)
            if let badge = product.badge {
                Text(badge)
                    .font(.caption2).bold()
                    .padding(.horizontal, 8).padding(.vertical, 2)
                    .background(Color.teal.opacity(0.15))
                    .foregroundStyle(.teal)
                    .clipShape(Capsule())
            }
            Text(product.name).font(.subheadline).bold()
            Text(product.description).font(.caption).foregroundStyle(.secondary).lineLimit(3)
            HStack {
                if let original = product.originalPriceCents {
                    Text(formatPrice(original)).font(.caption2).strikethrough().foregroundStyle(.secondary)
                }
                Text(formatPrice(product.priceCents)).font(.subheadline).bold()
            }
        }
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var premiumCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("⭐ Go Premium — Remove Ads & Unlock Everything")
                .font(.headline)
            Text("Ad-free experience, unlimited pet profiles, priority search, and Facebook group auto-post.")
                .font(.caption).foregroundStyle(.secondary)

            if let errorMessage = premiumStore.errorMessage {
                Text(errorMessage).font(.caption).foregroundStyle(.red)
            }

            if isPremium {
                Label("You're Premium", systemImage: "checkmark.seal.fill").foregroundStyle(.green)
            } else {
                Button {
                    Task {
                        guard let userId else { return }
                        await premiumStore.purchase(userId: userId) {
                            isPremium = true
                        }
                    }
                } label: {
                    if premiumStore.isBusy {
                        ProgressView()
                    } else if let product = premiumStore.product {
                        Text("Get Premium — \(product.displayPrice)/mo")
                    } else {
                        Text("Get Premium")
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(.purple)
                .disabled(premiumStore.isBusy || premiumStore.product == nil)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(LinearGradient(colors: [.indigo, .purple], startPoint: .topLeading, endPoint: .bottomTrailing))
        .foregroundStyle(.white)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func loadProfile() async {
        isLoadingProfile = true
        defer { isLoadingProfile = false }
        if let me = try? await APIClient.shared.getMe() {
            isPremium = me.user.is_premium
            userId = me.user.id
        }
    }

    private func formatPrice(_ cents: Int) -> String {
        String(format: "$%.2f", Double(cents) / 100)
    }
}
