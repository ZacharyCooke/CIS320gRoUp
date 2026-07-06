import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient, setAccessToken } from "../../services/api-client";

interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_2fa_enabled: boolean;
  is_facebook_connected: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

export function AccountSettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get("/auth/me")
      .then(({ data }) => setProfile(data.user))
      .catch(() => setLoadError("Could not load account — please log in again."));

    if (new URLSearchParams(window.location.search).get("error") === "facebook_auth_failed") {
      setActionError("Facebook connection failed. Please try again.");
    }
  }, []);

  function connectFacebook() {
    const token = localStorage.getItem("access_token") ?? "";
    window.location.href = `${API_BASE_URL}/auth/facebook?access_token=${encodeURIComponent(token)}`;
  }

  async function disconnectFacebook() {
    setActionError(null);
    setActionMsg(null);
    try {
      await apiClient.post("/auth/facebook/disconnect");
      setProfile((p) => (p ? { ...p, is_facebook_connected: false } : p));
      setActionMsg("Facebook disconnected.");
    } catch {
      setActionError("Could not disconnect Facebook.");
    }
  }

  async function handleLogout() {
    const refresh_token = localStorage.getItem("refresh_token");
    try {
      await apiClient.post("/auth/logout", { refresh_token });
    } catch { /* ignore — clear local state regardless */ }
    setAccessToken("");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/login");
  }

  if (loadError) {
    return (
      <section style={{ padding: "1.5rem" }}>
        <p role="alert" style={{ color: "#dc2626" }}>{loadError}</p>
        <Link to="/login">Sign in</Link>
      </section>
    );
  }

  if (!profile) return <p style={{ padding: "1.5rem" }}>Loading…</p>;

  return (
    <section style={{ padding: "1.5rem", maxWidth: 520, margin: "0 auto" }}>
      <Link to="/dashboard" style={{ display: "inline-block", marginBottom: 20 }}>← Dashboard</Link>
      <h1>Account Settings</h1>

      {actionMsg && <p style={{ color: "#0f766e" }}>{actionMsg}</p>}
      {actionError && <p role="alert" style={{ color: "#dc2626" }}>{actionError}</p>}

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", marginBottom: 20 }}>
        <h2 style={{ fontSize: "1rem", marginBottom: 16 }}>Contact Methods</h2>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "1px solid #f1f5f9" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{profile.email}</div>
            <div style={{ fontSize: "0.8rem", color: "#5f6f89" }}>Email</div>
          </div>
          <span style={{
            padding: "2px 10px",
            borderRadius: 12,
            fontSize: "0.75rem",
            fontWeight: 700,
            background: profile.is_email_verified ? "#d1fae5" : "#fef3c7",
            color: profile.is_email_verified ? "#065f46" : "#92400e"
          }}>
            {profile.is_email_verified ? "Verified" : "Unverified"}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12 }}>
          <div>
            <div style={{ fontWeight: 600 }}>{profile.phone ?? "No phone added"}</div>
            <div style={{ fontSize: "0.8rem", color: "#5f6f89" }}>Phone</div>
          </div>
          {profile.phone && (
            <span style={{
              padding: "2px 10px",
              borderRadius: 12,
              fontSize: "0.75rem",
              fontWeight: 700,
              background: profile.is_phone_verified ? "#d1fae5" : "#fef3c7",
              color: profile.is_phone_verified ? "#065f46" : "#92400e"
            }}>
              {profile.is_phone_verified ? "Verified" : "Unverified"}
            </span>
          )}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "1rem", margin: "0 0 4px" }}>Two-Factor Authentication</h2>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#5f6f89" }}>
              {profile.is_2fa_enabled
                ? "2FA is active — new device logins require Microsoft Authenticator."
                : "Protect your account by enabling 2FA via Microsoft Authenticator."}
            </p>
          </div>
          {profile.is_2fa_enabled ? (
            <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 700, background: "#d1fae5", color: "#065f46" }}>
              On
            </span>
          ) : (
            <Link to="/account/2fa-setup">
              <button type="button" style={{ fontSize: "0.875rem", padding: "8px 16px" }}>
                Enable
              </button>
            </Link>
          )}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "1rem", margin: "0 0 4px" }}>Facebook Groups</h2>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#5f6f89" }}>
              {profile.is_facebook_connected
                ? "Connected — your joined groups are searched for found-pet leads. We never store your Facebook password."
                : "Connect to search posts in Facebook groups you've joined for found-pet leads."}
            </p>
          </div>
          {profile.is_facebook_connected ? (
            <button type="button" onClick={disconnectFacebook} style={{ fontSize: "0.875rem", padding: "8px 16px", background: "#dc2626" }}>
              Disconnect
            </button>
          ) : (
            <button type="button" onClick={connectFacebook} style={{ fontSize: "0.875rem", padding: "8px 16px" }}>
              Connect Facebook
            </button>
          )}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", marginBottom: 20 }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 4px" }}>Session</h2>
        <p style={{ margin: "0 0 12px", fontSize: "0.875rem", color: "#5f6f89" }}>
          Signing out invalidates your current session on this device.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          style={{ background: "#dc2626" }}
        >
          Sign out
        </button>
      </div>
    </section>
  );
}
