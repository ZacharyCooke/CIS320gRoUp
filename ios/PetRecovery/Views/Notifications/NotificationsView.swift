import SwiftUI

struct AppNotification: Decodable, Identifiable {
    let id: String
    let type: String
    let title: String
    let body: String
    let read: Bool
    let created_at: String
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

func notificationColor(for type: String) -> (filter: NotificationFilter, color: Color) {
    switch type {
    case "pet_update", "found_report_match", "search_complete":
        return (.red, .red)
    case "bolo_alert":
        return (.blue, .blue)
    case "nearby_lost":
        return (.green, .green)
    case "claim_alert", "store_account":
        return (.amber, .orange)
    default:
        return (.all, .secondary)
    }
}

struct NotificationsView: View {
    @State private var notifications: [AppNotification] = []
    @State private var unread = 0
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var filter: NotificationFilter = .all

    @State private var notifPetUpdate = true
    @State private var notifBoloAlert = true
    @State private var notifNearbyLost = true
    @State private var notifStoreAccount = false
    @State private var settingsLoaded = false

    private var filtered: [AppNotification] {
        filter == .all ? notifications : notifications.filter { notificationColor(for: $0.type).filter == filter }
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
                                    Text("No notifications yet").foregroundStyle(.secondary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 24)
                            }
                        } else {
                            Section {
                                ForEach(filtered) { n in
                                    NotificationRow(notification: n)
                                }
                            }
                        }

                        if settingsLoaded {
                            Section("Notification Settings") {
                                Toggle("Owner updates on my search", isOn: $notifPetUpdate)
                                    .onChange(of: notifPetUpdate) { value in
                                        Task { try? await APIClient.shared.updateNotificationSettings(petUpdate: value) }
                                    }
                                Toggle("BOLO alerts within 1 mile", isOn: $notifBoloAlert)
                                    .onChange(of: notifBoloAlert) { value in
                                        Task { try? await APIClient.shared.updateNotificationSettings(boloAlert: value) }
                                    }
                                Toggle("Community alerts within 2 miles", isOn: $notifNearbyLost)
                                    .onChange(of: notifNearbyLost) { value in
                                        Task { try? await APIClient.shared.updateNotificationSettings(nearbyLost: value) }
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
        notifNearbyLost = me.user.notif_nearby_lost
        notifStoreAccount = me.user.notif_store_account
        settingsLoaded = true
    }

    private func markAllRead() async {
        _ = try? await APIClient.shared.request(path: "notifications/read-all", method: "POST")
        notifications = notifications.map {
            AppNotification(id: $0.id, type: $0.type, title: $0.title, body: $0.body, read: true, created_at: $0.created_at)
        }
        unread = 0
    }
}

private struct NotificationRow: View {
    let notification: AppNotification

    var body: some View {
        let color = notificationColor(for: notification.type).color
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Circle().fill(color).frame(width: 8, height: 8)
                Text(notification.title).bold()
                Spacer()
                if !notification.read {
                    Circle().fill(.teal).frame(width: 8, height: 8)
                }
            }
            Text(notification.body).font(.subheadline).foregroundStyle(.secondary)
            Text(formatDate(notification.created_at))
                .font(.caption).foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
        .listRowBackground(notification.read ? Color.clear : Color.teal.opacity(0.06))
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
