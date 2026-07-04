import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { connectToUser, disconnectUser } from "../../services/websocket.client";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

interface NotificationSettings {
  notif_pet_update: boolean;
  notif_bolo_alert: boolean;
  notif_nearby_lost: boolean;
  notif_store_account: boolean;
}

type FilterKey = "all" | "red" | "blue" | "green" | "amber";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "red", label: "Owner updates" },
  { key: "blue", label: "BOLO" },
  { key: "green", label: "Community" },
  { key: "amber", label: "Claims" }
];

function notificationColor(type: string): { bucket: FilterKey; color: string } {
  switch (type) {
    case "pet_update":
    case "found_report_match":
    case "search_complete":
      return { bucket: "red", color: "#dc2626" };
    case "bolo_alert":
      return { bucket: "blue", color: "#2563eb" };
    case "nearby_lost":
      return { bucket: "green", color: "#16a34a" };
    case "claim_alert":
    case "store_account":
      return { bucket: "amber", color: "#d97706" };
    default:
      return { bucket: "all", color: "#6b7280" };
  }
}

const LIVE_EVENTS = ["new_notification", "bolo_alert", "community_alert", "claim_alert", "found_report_match"];

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "Notification" in window ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    load();

    const socket = connectToUser();
    const handler = (n: NotificationItem) => {
      setNotifications((prev) => [n, ...prev]);
      setUnread((u) => u + 1);
    };
    for (const event of LIVE_EVENTS) socket.on(event, handler);
    return () => { disconnectUser(); };
  }, []);

  async function load() {
    try {
      const [notifRes, meRes] = await Promise.all([
        apiClient.get("/notifications"),
        apiClient.get("/auth/me")
      ]);
      setNotifications(notifRes.data.notifications);
      setUnread(notifRes.data.unread);
      setSettings({
        notif_pet_update: meRes.data.user.notif_pet_update,
        notif_bolo_alert: meRes.data.user.notif_bolo_alert,
        notif_nearby_lost: meRes.data.user.notif_nearby_lost,
        notif_store_account: meRes.data.user.notif_store_account
      });
    } catch {
      setLoadError("Could not load notifications — please log in again.");
    }
  }

  async function markAllRead() {
    await apiClient.post("/notifications/read-all");
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function toggleSetting(key: keyof NotificationSettings) {
    if (!settings) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      await apiClient.patch("/notifications/settings", { [key]: next[key] });
    } catch {
      setSettings(settings);
    }
  }

  async function requestPermission() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  const filtered = notifications.filter((n) => filter === "all" || notificationColor(n.type).bucket === filter);

  if (loadError) {
    return (
      <section style={{ padding: "1.5rem" }}>
        <p role="alert" style={{ color: "#dc2626" }}>{loadError}</p>
        <Link to="/login">Sign in</Link>
      </section>
    );
  }

  return (
    <section style={{ padding: "1.5rem", maxWidth: 640 }}>
      <Link to="/dashboard" style={{ display: "inline-block", marginBottom: 20 }}>← Dashboard</Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Notifications{unread > 0 ? ` (${unread})` : ""}</h1>
        {unread > 0 && (
          <button type="button" onClick={markAllRead} style={{ fontSize: "0.875rem" }}>
            Mark all read
          </button>
        )}
      </div>

      {permission === "default" && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 20px", marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px" }}>Enable browser notifications to get alerts even when this tab isn't focused.</p>
          <button type="button" onClick={requestPermission}>Enable notifications</button>
        </div>
      )}
      {permission === "denied" && (
        <p style={{ color: "#92400e", fontSize: "0.875rem" }}>
          Browser notifications are blocked — enable them in your browser's site settings to receive alerts outside this tab.
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            style={{
              padding: "4px 12px",
              borderRadius: 999,
              border: filter === f.key ? "1px solid #0f766e" : "1px solid #e2e8f0",
              background: filter === f.key ? "#0f766e" : "#fff",
              color: filter === f.key ? "#fff" : "#334155",
              fontSize: "0.8rem",
              cursor: "pointer"
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No notifications{filter !== "all" ? " of this type" : ""} yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
          {filtered.map((n) => {
            const { color } = notificationColor(n.type);
            return (
              <li key={n.id} style={{
                borderLeft: `4px solid ${color}`,
                background: n.read ? "#fff" : "#f8fafc",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 10
              }}>
                <div style={{ fontWeight: 600 }}>{n.title}</div>
                <div style={{ color: "#5f6f89", fontSize: "0.9rem", marginTop: 2 }}>{n.body}</div>
                <div style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: 4 }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {settings && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px" }}>
          <h2 style={{ fontSize: "1rem", marginBottom: 16 }}>Notification Settings</h2>
          <SettingRow
            label="Owner updates on my search (red)"
            checked={settings.notif_pet_update}
            onChange={() => toggleSetting("notif_pet_update")}
          />
          <SettingRow
            label="BOLO alerts within 1 mile (blue)"
            checked={settings.notif_bolo_alert}
            onChange={() => toggleSetting("notif_bolo_alert")}
          />
          <SettingRow
            label="Community alerts within 2 miles (green)"
            checked={settings.notif_nearby_lost}
            onChange={() => toggleSetting("notif_nearby_lost")}
          />
          <SettingRow
            label="Store & account notifications (amber)"
            checked={settings.notif_store_account}
            onChange={() => toggleSetting("notif_store_account")}
            last
          />
        </div>
      )}
    </section>
  );
}

function SettingRow({
  label, checked, onChange, last
}: { label: string; checked: boolean; onChange: () => void; last?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      paddingBottom: last ? 0 : 12, paddingTop: last ? 12 : 0,
      borderBottom: last ? "none" : "1px solid #f1f5f9"
    }}>
      <span style={{ fontSize: "0.9rem" }}>{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} />
    </div>
  );
}
