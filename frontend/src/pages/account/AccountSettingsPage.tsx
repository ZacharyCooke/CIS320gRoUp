import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiClient, setAccessToken } from "../../services/api-client";
import { Spinner } from "../../components/Spinner";
import { ErrorState } from "../../components/ErrorState";

interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_2fa_enabled: boolean;
  facebook_connected: boolean;
}

export function AccountSettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(
    searchParams.get("error") === "facebook_auth_failed"
      ? "Facebook connection failed — please try again."
      : null
  );
  const [facebookBusy, setFacebookBusy] = useState(false);

  function loadProfile() {
    setLoadError(null);
    apiClient
      .get("/auth/me")
      .then(({ data }) => setProfile(data.user))
      .catch(() => setLoadError("Could not load account — please log in again."));
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function connectFacebook() {
    setActionError(null);
    setFacebookBusy(true);
    try {
      const { data } = await apiClient.post("/auth/facebook", { platform: "web" });
      window.location.assign(data.redirect_url);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      setActionError(
        e.response?.status === 503
          ? "Facebook isn't configured on this server yet."
          : "Failed to start Facebook connection."
      );
      setFacebookBusy(false);
    }
  }

  async function disconnectFacebook() {
    setActionError(null);
    setFacebookBusy(true);
    try {
      await apiClient.post("/auth/facebook/disconnect");
      setProfile((prev) => (prev ? { ...prev, facebook_connected: false } : prev));
      setActionMsg("Facebook disconnected.");
    } catch {
      setActionError("Failed to disconnect Facebook.");
    } finally {
      setFacebookBusy(false);
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
      <section className="app-shell" style={{ maxWidth: 520 }}>
        <ErrorState message={loadError} onRetry={loadProfile} />
        <p style={{ marginTop: 12 }}><Link to="/login">Sign in</Link></p>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="app-shell" style={{ maxWidth: 520 }}>
        <Spinner label="Loading account…" />
      </section>
    );
  }

  return (
    <section className="app-shell" style={{ maxWidth: 520 }}>
      <Link to="/dashboard" style={{ display: "inline-block", marginBottom: 20 }}>← Dashboard</Link>
      <h1>Account Settings</h1>

      {actionMsg && <p style={{ color: "#0f766e" }}>{actionMsg}</p>}
      {actionError && <ErrorState message={actionError} />}

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
                ? "2FA is active — new device logins require a code from your authenticator app."
                : "Protect your account by enabling 2FA with an authenticator app (e.g., Microsoft Authenticator)."}
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
            <h2 style={{ fontSize: "1rem", margin: "0 0 4px" }}>Facebook</h2>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#5f6f89" }}>
              {profile.facebook_connected
                ? "Connected — your joined groups are scanned for lost-pet leads. Never used to log in or post."
                : "Optionally connect Facebook so your lost-pet searches also scan groups you've joined. Read-only — never used to log in or post."}
            </p>
          </div>
          {profile.facebook_connected ? (
            <button
              type="button"
              className="btn-outline"
              onClick={disconnectFacebook}
              disabled={facebookBusy}
              style={{ fontSize: "0.875rem", padding: "8px 16px" }}
            >
              {facebookBusy ? "Disconnecting…" : "Disconnect"}
            </button>
          ) : (
            <button
              type="button"
              onClick={connectFacebook}
              disabled={facebookBusy}
              style={{ fontSize: "0.875rem", padding: "8px 16px" }}
            >
              {facebookBusy ? "Connecting…" : "Connect Facebook"}
            </button>
          )}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", marginBottom: 20 }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 4px" }}>Session</h2>
        <p style={{ margin: "0 0 12px", fontSize: "0.875rem", color: "#5f6f89" }}>
          Signing out invalidates your current session on this device.
        </p>
        <button type="button" className="btn-danger" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </section>
  );
}
