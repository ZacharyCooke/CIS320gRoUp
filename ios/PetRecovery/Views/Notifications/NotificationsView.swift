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

struct NotificationsView: View {
    @State private var notifications: [AppNotification] = []
    @State private var unread = 0
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                } else if let error = errorMessage {
                    Text(error).foregroundStyle(.red).padding()
                } else if notifications.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "bell.slash").font(.system(size: 48)).foregroundStyle(.secondary)
                        Text("No notifications yet").foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(notifications) { n in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(n.title).bold()
                                Spacer()
                                if !n.read {
                                    Circle().fill(.teal).frame(width: 8, height: 8)
                                }
                            }
                            Text(n.body).font(.subheadline).foregroundStyle(.secondary)
                            Text(formatDate(n.created_at))
                                .font(.caption).foregroundStyle(.tertiary)
                        }
                        .padding(.vertical, 4)
                        .listRowBackground(n.read ? Color.clear : Color.teal.opacity(0.06))
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
            .task { await loadNotifications() }
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

    private func markAllRead() async {
        _ = try? await APIClient.shared.request(path: "notifications/read-all", method: "POST")
        notifications = notifications.map {
            AppNotification(id: $0.id, type: $0.type, title: $0.title, body: $0.body, read: true, created_at: $0.created_at)
        }
        unread = 0
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
