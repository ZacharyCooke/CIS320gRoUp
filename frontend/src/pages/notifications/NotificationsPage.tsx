import { useEffect, useState } from "react";
import { apiClient } from "../../services/api-client";
import {
  notificationPermission,
  requestNotificationPermission
} from "../../services/push-notifications";

type NotificationType =
  | "found_report_match"
  | "search_complete"
  | "system"
  | "pet_update"
  | "bolo_alert"
  | "community_alert"
  | "claim_alert"
  | "proximity_alert";

interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationSettings {
  pet_update: boolean;
  bolo_alert: boolean;
  community_alert: boolean;
  claim_alert: boolean;
}

const FILTERS: { label: string; types: NotificationType[] | null }[] = [
  { label: "All", types: null },
  { label: "Pet updates", types: ["pet_update", "found_report_match", "search_complete"] },
  { label: "BOLO", types: ["bolo_alert"] },
  { label: "Community", types: ["community_alert"] },
  { label: "Claims & rewards", types: ["claim_alert", "proximity_alert"] }
];

const COLORS: Record<NotificationType, { bg: string; fg: string; label: string }> = {
  pet_update: { bg: "#fee2e2", fg: "#991b1b", label: "Red" },
  found_report_match: { bg: "#fee2e2", fg: "#991b1b", label: "Red" },
  search_complete: { bg: "#fee2e2", fg: "#991b1b", label: "Red" },
  bolo_alert: { bg: "#dbeafe", fg: "#1e40af", label: "Blue" },
  community_alert: { bg: "#dcfce7", fg: "#166534", label: "Green" },
  claim_alert: { bg: "#fef3c7", fg: "#92400e", label: "Amber" },
  proximity_alert: { bg: "#fef3c7", fg: "#92400e", label: "Amber" },
  system: { bg: "#f3f4f6", fg: "#4b5563", label: "System" }
};

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [activeFilter, setActiveFilter] = useState(0);
  const [permission, setPermission] = useState(notificationPermission());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get("/notifications"),
      apiClient.get("/notifications/settings")
    ])
      .then(([notifRes, settingsRes]) => {
        setNotifications(notifRes.data.notifications ?? []);
        setSettings(settingsRes.data.settings);
      })
      .catch(() => setError("Could not load notifications."))
      .finally(() => setLoading(false));
  }, []);

  async function enableBrowserNotifications() {
    const result = await requestNotificationPermission();
    setPermission(result);
  }

  async function toggleSetting(key: keyof NotificationSettings) {
    if (!settings) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    await apiClient.patch("/notifications/settings", { [key]: next[key] });
  }

  async function markAllRead() {
    await apiClient.post("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const filter = FILTERS[activeFilter];
  const visible = filter.types
    ? notifications.filter((n) => filter.types!.includes(n.type))
    : notifications;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) return <p style={{ padding: "1rem" }}>Loading…</p>;
  if (error) return <p style={{ padding: "1rem", color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: "1rem", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}</h2>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllRead} style={{ background: "none", border: "none", color: "#0f766e", cursor: "pointer" }}>
            Mark all read
          </button>
        )}
      </div>

      {permission !== "granted" && permission !== "unsupported" && (
        <div style={{
          background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8,
          padding: "0.75rem 1rem", marginBottom: "1rem",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem"
        }}>
          <span>Enable browser notifications to get alerted even when this tab isn't focused.</span>
          <button type="button" onClick={enableBrowserNotifications} style={{ whiteSpace: "nowrap" }}>
            Enable
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {FILTERS.map((f, i) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setActiveFilter(i)}
            style={{
              padding: "4px 12px", borderRadius: 999, border: "1px solid #e5e7eb",
              background: activeFilter === i ? "#0f766e" : "#fff",
              color: activeFilter === i ? "#fff" : "#111827",
              cursor: "pointer", fontSize: "0.85rem"
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No notifications in this category yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {visible.map((n) => {
            const color = COLORS[n.type];
            return (
              <li key={n.id} style={{
                display: "flex", gap: "0.75rem", padding: "0.75rem",
                border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: "0.5rem",
                background: n.is_read ? "#fff" : "#fafafa"
              }}>
                <span style={{ width: 6, borderRadius: 3, background: color.fg }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{n.title}</div>
                  <div style={{ color: "#6b7280", fontSize: "0.9rem", marginTop: 2 }}>{n.body}</div>
                  <div style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
                <span style={{
                  alignSelf: "flex-start", fontSize: "0.7rem", fontWeight: 700,
                  padding: "2px 8px", borderRadius: 999, background: color.bg, color: color.fg
                }}>
                  {color.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {settings && (
        <div style={{ marginTop: "2rem", borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
          <h3>Notification settings</h3>
          <ToggleRow label="Pet updates (red) — sightings, matches, vet BOLO status" value={settings.pet_update} onChange={() => toggleSetting("pet_update")} />
          <ToggleRow label="BOLO alerts (blue) — you're near an active lost pet" value={settings.bolo_alert} onChange={() => toggleSetting("bolo_alert")} />
          <ToggleRow label="Community alerts (green) — a pet was just reported lost nearby" value={settings.community_alert} onChange={() => toggleSetting("community_alert")} />
          <ToggleRow label="Claims & rewards (amber) — found-report claims, reward proximity" value={settings.claim_alert} onChange={() => toggleSetting("claim_alert")} />
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0", cursor: "pointer" }}>
      <input type="checkbox" checked={value} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}
