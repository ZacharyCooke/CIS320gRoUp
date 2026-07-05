import SwiftUI

// Static house-ad content, mirroring frontend/src/components/AdBanner.tsx — this
// app has no real ad-network integration (out of scope per FR-032, which only
// requires free accounts see contextual ads that Premium removes).
private struct AdCreative {
    let headline: String
    let body: String
}

private let adCreatives: [AdCreative] = [
    AdCreative(headline: "Waggle Pet Insurance", body: "Get 2 months free when you sign up through PetRecovery."),
    AdCreative(headline: "20% off your first order", body: "Stock up on food, toys, and safety gear for your pet.")
]

struct AdBannerView: View {
    let isPremium: Bool
    var adIndex: Int = 0
    @State private var dismissed = false

    var body: some View {
        if !isPremium && !dismissed {
            let ad = adCreatives[adIndex % adCreatives.count]
            HStack(alignment: .top, spacing: 10) {
                Text("AD")
                    .font(.caption2).bold()
                    .padding(.horizontal, 6).padding(.vertical, 2)
                    .background(Color.yellow.opacity(0.6))
                    .cornerRadius(4)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text(ad.headline).font(.subheadline).bold()
                    Text(ad.body).font(.caption).foregroundStyle(.secondary)
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel("Advertisement: \(ad.headline). \(ad.body)")
                Spacer()
                Button(action: { dismissed = true }) {
                    Image(systemName: "xmark").foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Dismiss ad")
            }
            .padding(12)
            .background(Color.yellow.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
}

struct SidebarAdView: View {
    let isPremium: Bool
    var adIndex: Int = 1
    @State private var dismissed = false

    var body: some View {
        if !isPremium && !dismissed {
            let ad = adCreatives[adIndex % adCreatives.count]
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("AD")
                        .font(.caption2).bold()
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(Color.yellow.opacity(0.6))
                        .cornerRadius(4)
                        .accessibilityHidden(true)
                    Spacer()
                    Button(action: { dismissed = true }) {
                        Image(systemName: "xmark").foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Dismiss ad")
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(ad.headline).font(.subheadline).bold()
                    Text(ad.body).font(.caption).foregroundStyle(.secondary)
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel("Advertisement: \(ad.headline). \(ad.body)")
            }
            .padding(14)
            .background(Color.yellow.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}
