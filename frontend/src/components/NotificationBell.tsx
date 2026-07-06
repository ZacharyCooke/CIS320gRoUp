import { useEffect, useRef, useState } from "react";
import { apiClient } from "../services/api-client";
import { io } from "socket.io-client";
import { showBrowserNotification } from "../services/push-notifications";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

const WS_URL = import.meta.env.VITE_API_BASE_URL?.replace("/api", "") ?? "http://localhost:3000";

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();

    const socket = io(WS_URL, { query: { userId }, transports: ["websocket"] });
    socket.on("new_result", (n: Notification) => {
      if (n.type && n.title) {
        setNotifications((prev) => [n, ...prev]);
        setUnread((u) => u + 1);
        showBrowserNotification(n.title, n.body);
      }
    });
    return () => { socket.disconnect(); };
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadNotifications() {
    try {
      const { data } = await apiClient.get("/notifications");
      setNotifications(data.notifications);
      setUnread(data.unread);
    } catch { /* not logged in */ }
  }

  async function markAllRead() {
    await apiClient.post("/notifications/read-all");
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div style={{ position: "relative" }} ref={drawerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: "1.4rem", position: "relative", padding: "4px 8px"
        }}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 0, right: 0,
            background: "#dc2626", color: "#fff",
            borderRadius: "999px", fontSize: "0.65rem",
            minWidth: 18, height: 18, display: "flex",
            alignItems: "center", justifyContent: "center",
            padding: "0 4px", fontWeight: 700
          }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)",
          width: 340, maxHeight: 480, overflowY: "auto",
          background: "#fff", borderRadius: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          border: "1px solid #e5e7eb", zIndex: 500
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderBottom: "1px solid #e5e7eb"
          }}>
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" onClick={markAllRead}
                style={{ background: "none", border: "none", color: "#0f766e", cursor: "pointer", fontSize: "0.85rem" }}>
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p style={{ padding: "1.5rem", color: "#6b7280", textAlign: "center", margin: 0 }}>No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} style={{
                padding: "12px 16px", borderBottom: "1px solid #f3f4f6",
                background: n.read ? "#fff" : "#f0fdf9"
              }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{n.title}</div>
                <div style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: 2 }}>{n.body}</div>
                <div style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: 4 }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
