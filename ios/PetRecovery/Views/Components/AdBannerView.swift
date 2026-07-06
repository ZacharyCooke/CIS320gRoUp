import SwiftUI

struct AdBannerView: View {
    enum Slot {
        case banner
        case sidebar
    }

    let slot: Slot

    @State private var dismissedIndices: Set<Int> = []

    private var ads: [(title: String, body: String)] {
        switch slot {
        case .banner:
            return [
                ("PetRecovery Premium", "Remove ads and unlock unlimited pet profiles."),
                ("GPS Tracker Collars", "Never lose track of your pet again.")
            ]
        case .sidebar:
            return [
                ("Pet First Aid Kits", "Vet-recommended kits, ships in 2 days."),
                ("Engraved ID Tags", "A backup for the backup.")
            ]
        }
    }

    var body: some View {
        VStack(spacing: 8) {
            ForEach(Array(ads.enumerated()), id: \.offset) { index, ad in
                if !dismissedIndices.contains(index) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(ad.title).font(.subheadline).bold()
                            Text(ad.body).font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button {
                            dismissedIndices.insert(index)
                        } label: {
                            Image(systemName: "xmark").font(.caption).foregroundStyle(.secondary)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Dismiss ad")
                    }
                    .padding(10)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
    }
}
