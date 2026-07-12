import SwiftUI
import CoreLocation

struct AppNotification: Decodable, Identifiable {
    let id: String
    let type: String
    let title: String
    let body: String
    let read: Bool
    let created_at: String
    let trigger_latitude: Double?
    let trigger_longitude: Double?
}

struct NotificationsResponse: Decodable {
    let notifications: [AppNotification]
    let unread: Int
}

enum NotificationFilter: String, CaseIterable {
    case all = "All"
    case red = "Owner"
    case blue = "BOLO"
    case green = "Community"
    case amber = "Claims"
}

// Mirrors the web client's notificationMeta() (NotificationsPage.tsx) so the
// two platforms show the same icon/label/color per notification type.
func notificationMeta(for type: String) -> (filter: NotificationFilter, color: Color, icon: String, label: String) {
    switch type {
    case "pet_update":
        return (.red, .red, "🐕", "Your Lost Pet")
    case "found_report_match":
        return (.red, .red, "📍", "Found Report Match")
    case "search_complete":
        return (.red, .red, "✅", "Search Update")
    case "bolo_alert":
        return (.blue, .blue, "📡", "BOLO Alert")
    case "nearby_lost":
        return (.green, .green, "🐾", "Lost Pet Near You")
    case "nearby_found":
        return (.green, .green, "🤝", "Found Pet Near You")
    case "claim_alert":
        return (.amber, .orange, "🤝", "Claim")
    case "store_account":
        return (.amber, .orange, "🛍", "Store & Account")
    default:
        return (.all, .secondary, "🔔", "Notification")
    }
}

// Only BOLO/community types carry a trigger location worth centering a map
// on (the recipient's proximity ping location, not the pet's own coordinates
// — see notification-links.ts for the same rule on web).
private let mapLinkableTypes: Set<String> = ["bolo_alert", "nearby_lost", "nearby_found"]

private func mapCoordinate(for n: AppNotification) -> CLLocationCoordinate2D? {
    guard mapLinkableTypes.contains(n.type),
          let lat = n.trigger_latitude, let lng = n.trigger_longitude else { return nil }
    return CLLocationCoordinate2D(latitude: lat, longitude: lng)
}

struct NotificationsView: View {
    @State private var notifications: [AppNotification] = []
    @State private var unread = 0
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var filter: NotificationFilter = .all

    @State private var notifPetUpdate = true
    @State private var notifBoloAlert = true
    @State private var notifBoloRadiusMiles: Double = 5
    @State private var notifNearbyLost = true
    @State private var notifNearbyFound = true
    @State private var notifStoreAccount = false
    @State private var settingsLoaded = false

    private var filtered: [AppNotification] {
        filter == .all ? notifications : notifications.filter { notificationMeta(for: $0.type).filter == filter }
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                } else if let error = errorMessage {
                    Text(error).foregroundStyle(.red).padding()
                } else {
                    List {
                        Section {
                            Picker("Filter", selection: $filter) {
                                ForEach(NotificationFilter.allCases, id: \.self) { f in
                                    Text(f.rawValue).tag(f)
                                }
                            }
                            .pickerStyle(.segmented)
                        }
                        .listRowSeparator(.hidden)

                        if filtered.isEmpty {
                            Section {
                                VStack(spacing: 12) {
                                    Image(systemName: "bell.slash").font(.system(size: 40)).foregroundStyle(.secondary)
                                        .accessibilityHidden(true)
                                    Text("No notifications yet").foregroundStyle(.secondary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 24)
                            }
                        } else {
                            Section {
                                ForEach(filtered) { n in
                                    if let coordinate = mapCoordinate(for: n) {
                                        NavigationLink {
                                            CommunityMapView(initialCoordinate: coordinate)
                                        } label: {
                                            NotificationRow(notification: n, isLinkable: true)
                                        }
                                        .simultaneousGesture(TapGesture().onEnded {
                                            Task { await markRead(n) }
                                        })
                                    } else {
                                        NotificationRow(notification: n)
                                    }
                                }
                            }
                        }

                        if settingsLoaded {
                            Section("Notification Settings") {
                                Toggle("Owner updates on my search", isOn: $notifPetUpdate)
                                    .onChange(of: notifPetUpdate) { value in
                                        Task { try? await APIClient.shared.updateNotificationSettings(petUpdate: value) }
                                    }
                                Toggle("BOLO alerts within \(Int(notifBoloRadiusMiles)) mi", isOn: $notifBoloAlert)
                                    .onChange(of: notifBoloAlert) { value in
                                        Task { try? await APIClient.shared.updateNotificationSettings(boloAlert: value) }
                                    }
                                if notifBoloAlert {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("BOLO radius: \(Int(notifBoloRadiusMiles)) mi")
                                            .font(.caption).foregroundStyle(.secondary)
                                        Slider(value: $notifBoloRadiusMiles, in: 1...50, step: 1) { editing in
                                            guard !editing else { return }
                                            Task {
                                                try? await APIClient.shared.updateNotificationSettings(boloRadiusMiles: notifBoloRadiusMiles)
                                            }
                                        }
                                        .accessibilityValue("\(Int(notifBoloRadiusMiles)) miles")
                                    }
                                }
                                Toggle("Community alerts within 2 miles", isOn: $notifNearbyLost)
                                    .onChange(of: notifNearbyLost) { value in
                                        Task { try? await APIClient.shared.updateNotificationSettings(nearbyLost: value) }
                                    }
                                Toggle("Found-pet alerts nearby", isOn: $notifNearbyFound)
                                    .onChange(of: notifNearbyFound) { value in
                                        Task { try? await APIClient.shared.updateNotificationSettings(nearbyFound: value) }
                                    }
                                Toggle("Store & account notifications", isOn: $notifStoreAccount)
                                    .onChange(of: notifStoreAccount) { value in
                                        Task { try? await APIClient.shared.updateNotificationSettings(storeAccount: value) }
                                    }
                            }
                        }
                    }
                }
            }
            .navigationTitle(unread > 0 ? "Notifications (\(unread))" : "Notifications")
            .toolbar {
                if unread > 0 {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Mark all read") { Task { await markAllRead() } }
                    }
                }
            }
            .task {
                await loadNotifications()
                await loadSettings()
            }
            .refreshable { await loadNotifications() }
        }
    }

    private func loadNotifications() async {
        isLoading = true
        do {
            let (data, _) = try await APIClient.shared.request(path: "notifications")
            let decoded = try JSONDecoder().decode(NotificationsResponse.self, from: data)
            notifications = decoded.notifications
            unread = decoded.unread
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func loadSettings() async {
        guard let me = try? await APIClient.shared.getMe() else { return }
        notifPetUpdate = me.user.notif_pet_update
        notifBoloAlert = me.user.notif_bolo_alert
        notifBoloRadiusMiles = me.user.notif_bolo_radius_miles
        notifNearbyLost = me.user.notif_nearby_lost
        notifNearbyFound = me.user.notif_nearby_found
        notifStoreAccount = me.user.notif_store_account
        settingsLoaded = true
    }

    private func markRead(_ n: AppNotification) async {
        guard !n.read else { return }
        if let idx = notifications.firstIndex(where: { $0.id == n.id }) {
            notifications[idx] = AppNotification(
                id: n.id, type: n.type, title: n.title, body: n.body, read: true,
                created_at: n.created_at, trigger_latitude: n.trigger_latitude, trigger_longitude: n.trigger_longitude
            )
        }
        unread = max(0, unread - 1)
        _ = try? await APIClient.shared.request(path: "notifications/\(n.id)/read", method: "PATCH")
    }

    private func markAllRead() async {
        _ = try? await APIClient.shared.request(path: "notifications/read-all", method: "POST")
        notifications = notifications.map {
            AppNotification(
                id: $0.id, type: $0.type, title: $0.title, body: $0.body, read: true,
                created_at: $0.created_at, trigger_latitude: $0.trigger_latitude, trigger_longitude: $0.trigger_longitude
            )
        }
        unread = 0
    }
}

private struct NotificationRow: View {
    let notification: AppNotification
    var isLinkable: Bool = false

    var body: some View {
        let meta = notificationMeta(for: notification.type)
        HStack(alignment: .top, spacing: 10) {
            Text(meta.icon)
                .font(.title3)
                .frame(width: 32, height: 32)
                .background(meta.color.opacity(0.15))
                .clipShape(Circle())
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 3) {
                Text(meta.label)
                    .font(.caption2).bold()
                    .foregroundStyle(meta.color)
                HStack {
                    Text(notification.title).bold()
                    Spacer()
                    if !notification.read {
                        Circle().fill(.teal).frame(width: 8, height: 8)
                            .accessibilityHidden(true)
                    }
                }
                Text(notification.body).font(.subheadline).foregroundStyle(.secondary)
                HStack {
                    Text(formatDate(notification.created_at))
                        .font(.caption).foregroundStyle(.tertiary)
                    if isLinkable {
                        Spacer()
                        Text("View on map →")
                            .font(.caption2).bold()
                            .foregroundStyle(meta.color)
                    }
                }
            }
        }
        .padding(.vertical, 4)
        .listRowBackground(notification.read ? Color.clear : Color.teal.opacity(0.06))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(notification.read ? "" : "Unread. ")\(meta.label): \(notification.title)")
        .accessibilityValue("\(notification.body), \(formatDate(notification.created_at))")
    }

    private func formatDate(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: iso) else { return iso }
        let rel = RelativeDateTimeFormatter()
        rel.unitsStyle = .abbreviated
        return rel.localizedString(for: date, relativeTo: Date())
    }
}
