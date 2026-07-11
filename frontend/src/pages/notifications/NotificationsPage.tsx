import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { connectToUser, disconnectUser } from "../../services/websocket.client";
import { showBrowserNotification } from "../../services/push-notifications";
import { notificationLink } from "../../services/notification-links";
import { Spinner } from "../../components/Spinner";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  trigger_latitude: number | null;
  trigger_longitude: number | null;
  created_at: string;
}

interface NotificationSettings {
  notif_pet_update: boolean;
  notif_bolo_alert: boolean;
  notif_nearby_lost: boolean;
  notif_nearby_found: boolean;
  notif_store_account: boolean;
}

type FilterKey = "all" | "red" | "blue" | "green" | "amber";
type ColorKey = "red" | "blue" | "green" | "amber" | "gray";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "red", label: "Owner updates" },
  { key: "blue", label: "BOLO" },
  { key: "green", label: "Community" },
  { key: "amber", label: "Claims" }
];

const LEGEND: { color: ColorKey; label: string }[] = [
  { color: "red", label: "Your lost pet updates" },
  { color: "blue", label: "BOLO — you're near a missing pet" },
  { color: "green", label: "Lost or found pet reported near you" },
  { color: "amber", label: "Claims & store" }
];

function notificationMeta(type: string): { bucket: FilterKey; color: ColorKey; icon: string; label: string } {
  switch (type) {
    case "pet_update":
      return { bucket: "red", color: "red", icon: "🐕", label: "Your Lost Pet" };
    case "found_report_match":
      return { bucket: "red", color: "red", icon: "📍", label: "Found Report Match" };
    case "search_complete":
      return { bucket: "red", color: "red", icon: "✅", label: "Search Update" };
    case "bolo_alert":
      return { bucket: "blue", color: "blue", icon: "📡", label: "BOLO Alert" };
    case "nearby_lost":
      return { bucket: "green", color: "green", icon: "🐾", label: "Lost Pet Near You" };
    case "nearby_found":
      return { bucket: "green", color: "green", icon: "🤝", label: "Found Pet Near You" };
    case "claim_alert":
      return { bucket: "amber", color: "amber", icon: "🤝", label: "Claim" };
    case "store_account":
      return { bucket: "amber", color: "amber", icon: "🛍", label: "Store & Account" };
    default:
      return { bucket: "all", color: "gray", icon: "🔔", label: "Notification" };
  }
}

const LIVE_EVENTS = ["new_notification", "bolo_alert", "community_alert", "claim_alert", "found_report_match", "nearby_found_alert"];

export function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
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
      showBrowserNotification(n.title, n.body);
    };
    for (const event of LIVE_EVENTS) socket.on(event, handler);
    return () => { disconnectUser(); };
  }, []);

  async function load() {
    setLoading(true);
    setLoadError(null);
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
        notif_nearby_found: meRes.data.user.notif_nearby_found,
        notif_store_account: meRes.data.user.notif_store_account
      });
    } catch {
      setLoadError("Could not load notifications — please log in again.");
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    await apiClient.post("/notifications/read-all");
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function openNotification(n: NotificationItem) {
    const link = notificationLink(n);
    if (!link) return;

    if (!n.read) {
      setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
      setUnread((u) => Math.max(0, u - 1));
      apiClient.patch(`/notifications/${n.id}/read`).catch(() => {});
    }

    navigate(link);
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

  const filtered = notifications.filter((n) => filter === "all" || notificationMeta(n.type).bucket === filter);

  if (loading) {
    return (
      <section className="app-shell" style={{ maxWidth: 720 }}>
        <Spinner label="Loading notifications…" />
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="app-shell" style={{ maxWidth: 720 }}>
        <ErrorState message={loadError} onRetry={load} />
        <p style={{ marginTop: 12 }}><Link to="/login">Sign in</Link></p>
      </section>
    );
  }

  return (
    <section className="app-shell" style={{ maxWidth: 720 }}>
      <Link to="/dashboard" style={{ display: "inline-block", marginBottom: 20 }}>← Dashboard</Link>

      <div className="page-header-row">
        <div>
          <h1>🔔 Notifications{unread > 0 ? ` (${unread})` : ""}</h1>
          <p className="page-sub">Stay updated on your pets' searches and lost pets near you.</p>
        </div>
        {unread > 0 && (
          <button type="button" onClick={markAllRead} className="btn-outline">
            Mark all read
          </button>
        )}
      </div>

      {permission === "default" && (
        <div className="permission-card">
          <div className="permission-icon">📲</div>
          <div>
            <h3>Enable Push Notifications</h3>
            <p>Get real-time BOLO alerts when you're near a missing pet, and immediate updates on your own pet's search.</p>
            <div className="permission-btns">
              <button type="button" className="btn-white" onClick={requestPermission}>Allow Notifications</button>
            </div>
          </div>
        </div>
      )}
      {permission === "denied" && (
        <p style={{ color: "#92400e", fontSize: "0.875rem" }}>
          Browser notifications are blocked — enable them in your browser's site settings to receive alerts outside this tab.
        </p>
      )}

      <div className="notif-legend">
        {LEGEND.map((l) => (
          <div className="notif-legend-item" key={l.color}>
            <span className={`dot dot-${l.color}`} />
            {l.label}
          </div>
        ))}
      </div>

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
              cursor: "pointer",
              minHeight: "auto"
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🔔"
          message={`No notifications${filter !== "all" ? " of this type" : ""} yet.`}
        />
      ) : (
        <div style={{ marginBottom: 24 }}>
          {filtered.map((n) => {
            const meta = notificationMeta(n.type);
            const link = notificationLink(n);
            return (
              <div
                key={n.id}
                className="section-card notif-card"
                style={{
                  borderLeft: `4px solid ${colorHex(meta.color)}`,
                  background: n.read ? "#fff" : "#f8fafc",
                  marginBottom: 10,
                  padding: "14px 18px",
                  cursor: link ? "pointer" : undefined
                }}
                role={link ? "button" : undefined}
                tabIndex={link ? 0 : undefined}
                onClick={link ? () => openNotification(n) : undefined}
                onKeyDown={
                  link
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openNotification(n);
                        }
                      }
                    : undefined
                }
              >
                <div className={`notif-avatar notif-avatar-${meta.color}`}>{meta.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={`notif-type-label`} style={{ color: colorHex(meta.color) }}>{meta.label}</div>
                  <div style={{ fontWeight: 700 }}>{n.title}</div>
                  <div style={{ color: "#5f6f89", fontSize: "0.9rem", marginTop: 2 }}>{n.body}</div>
                  <div style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: 6 }}>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                  {link && (
                    <div style={{ color: colorHex(meta.color), fontSize: "0.78rem", marginTop: 6, fontWeight: 600 }}>
                      View on map →
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {settings && (
        <div className="section-card">
          <div className="section-title" style={{ fontSize: "0.95rem", color: "#1e293b", textTransform: "none", letterSpacing: 0 }}>
            ⚙️ Notification Settings
          </div>
          <SettingRow
            label="Owner updates on my search"
            sub="Updates, sightings, and database matches for your lost pets"
            checked={settings.notif_pet_update}
            onChange={() => toggleSetting("notif_pet_update")}
          />
          <SettingRow
            label="BOLO alerts within 1 mile"
            sub="Notified when you enter 1 mile of a missing pet's last known location"
            checked={settings.notif_bolo_alert}
            onChange={() => toggleSetting("notif_bolo_alert")}
          />
          <SettingRow
            label="Community alerts within 2 miles"
            sub="Alert when a pet is reported lost within 2 miles of your GPS location"
            checked={settings.notif_nearby_lost}
            onChange={() => toggleSetting("notif_nearby_lost")}
          />
          <SettingRow
            label="Found-pet alerts nearby"
            sub="Alert when someone reports finding a pet within 5 miles of your GPS location"
            checked={settings.notif_nearby_found}
            onChange={() => toggleSetting("notif_nearby_found")}
          />
          <SettingRow
            label="Store & account notifications"
            sub="Claim alerts and account-related updates"
            checked={settings.notif_store_account}
            onChange={() => toggleSetting("notif_store_account")}
            last
          />
        </div>
      )}
    </section>
  );
}

function colorHex(color: ColorKey): string {
  switch (color) {
    case "red": return "#b91c1c";
    case "blue": return "#1d4ed8";
    case "green": return "#15803d";
    case "amber": return "#92400e";
    default: return "#6b7280";
  }
}

function SettingRow({
  label, sub, checked, onChange, last
}: { label: string; sub: string; checked: boolean; onChange: () => void; last?: boolean }) {
  return (
    <div className="list-row" style={{ borderBottom: last ? "none" : undefined }}>
      <div>
        <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{sub}</div>
      </div>
      <input type="checkbox" className="toggle-switch" checked={checked} onChange={onChange} aria-label={label} />
    </div>
  );
}
