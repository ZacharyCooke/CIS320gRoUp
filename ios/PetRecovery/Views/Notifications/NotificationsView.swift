import SwiftUI

private struct FilterOption: Identifiable {
    let id = UUID()
    let label: String
    let types: [String]?
}

private let filterOptions: [FilterOption] = [
    FilterOption(label: "All", types: nil),
    FilterOption(label: "Pet updates", types: ["pet_update", "found_report_match", "search_complete"]),
    FilterOption(label: "BOLO", types: ["bolo_alert"]),
    FilterOption(label: "Community", types: ["community_alert"]),
    FilterOption(label: "Claims & rewards", types: ["claim_alert", "proximity_alert"])
]

private func colorFor(_ type: String) -> Color {
    switch type {
    case "pet_update", "found_report_match", "search_complete": return .red
    case "bolo_alert": return .blue
    case "community_alert": return .green
    case "claim_alert", "proximity_alert": return .orange
    default: return .secondary
    }
}

struct NotificationsView: View {
    @State private var notifications: [NotificationDTO] = []
    @State private var settings: NotificationSettingsDTO?
    @State private var unread = 0
    @State private var activeFilter = 0
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                } else if let error = errorMessage {
                    Text(error).foregroundStyle(.red).padding()
                } else {
                    content
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
            .task { await loadAll() }
            .refreshable { await loadAll() }
        }
    }

    private var content: some View {
        List {
            Section {
                Picker("Filter", selection: $activeFilter) {
                    ForEach(Array(filterOptions.enumerated()), id: \.offset) { index, option in
                        Text(option.label).tag(index)
                    }
                }
                .pickerStyle(.segmented)
                .listRowInsets(EdgeInsets())
                .padding(.vertical, 4)
            }

            Section {
                if filteredNotifications.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "bell.slash").font(.system(size: 40)).foregroundStyle(.secondary)
                        Text("No notifications in this category yet").foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
                    .listRowSeparator(.hidden)
                } else {
                    ForEach(filteredNotifications) { n in
                        NotificationRow(notification: n)
                            .listRowBackground(n.read ? Color.clear : colorFor(n.type).opacity(0.06))
                    }
                }
            }

            if let settings {
                Section("Notification settings") {
                    settingsToggle("Pet updates (red)", isOn: settings.pet_update) { updateSetting(\.pet_update, to: $0) }
                    settingsToggle("BOLO alerts (blue)", isOn: settings.bolo_alert) { updateSetting(\.bolo_alert, to: $0) }
                    settingsToggle("Community alerts (green)", isOn: settings.community_alert) { updateSetting(\.community_alert, to: $0) }
                    settingsToggle("Claims & rewards (amber)", isOn: settings.claim_alert) { updateSetting(\.claim_alert, to: $0) }
                }
            }
        }
    }

    private var filteredNotifications: [NotificationDTO] {
        guard let types = filterOptions[activeFilter].types else { return notifications }
        return notifications.filter { types.contains($0.type) }
    }

    @ViewBuilder
    private func settingsToggle(_ label: String, isOn: Bool, onChange: @escaping (Bool) -> Void) -> some View {
        Toggle(label, isOn: Binding(get: { isOn }, set: onChange))
    }

    private func updateSetting(_ keyPath: WritableKeyPath<NotificationSettingsDTO, Bool>, to value: Bool) {
        guard var next = settings else { return }
        next[keyPath: keyPath] = value
        settings = next
        Task { try? await APIClient.shared.updateNotificationSettings(next) }
    }

    private func loadAll() async {
        isLoading = true
        do {
            async let notifResponse = APIClient.shared.getNotifications()
            async let settingsResponse = APIClient.shared.getNotificationSettings()
            let (notifResult, settingsResult) = try await (notifResponse, settingsResponse)
            notifications = notifResult.notifications
            unread = notifResult.unread
            settings = settingsResult
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func markAllRead() async {
        await APIClient.shared.markAllNotificationsRead()
        notifications = notifications.map {
            NotificationDTO(id: $0.id, type: $0.type, title: $0.title, body: $0.body, read: true, created_at: $0.created_at)
        }
        unread = 0
    }
}

private struct NotificationRow: View {
    let notification: NotificationDTO

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            RoundedRectangle(cornerRadius: 2)
                .fill(colorFor(notification.type))
                .frame(width: 4)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 4) {
                Text(notification.title).bold()
                Text(notification.body).font(.subheadline).foregroundStyle(.secondary)
                Text(formatDate(notification.created_at))
                    .font(.caption).foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 4)
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
