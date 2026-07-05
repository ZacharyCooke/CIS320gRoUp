import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient, setAccessToken } from "../../services/api-client";

type Screen = "credentials" | "totp";

export function LoginPage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post("/auth/login", { email, password });

      if (data.requires_2fa) {
        setPendingUserId(data.user_id);
        setScreen("totp");
        return;
      }

      storeTokens(data);
      navigate("/dashboard");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      const code = e.response?.data?.error;
      if (code === "invalid_credentials") {
        setError("Incorrect email or password.");
      } else if (code === "email_not_verified") {
        setError("Please verify your email before logging in.");
      } else {
        setError("Login failed — please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleTotp(event: React.FormEvent) {
    event.preventDefault();
    if (!pendingUserId) return;
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post("/auth/2fa/verify", {
        user_id: pendingUserId,
        code: totpCode
      });
      storeTokens(data);
      navigate("/dashboard");
    } catch {
      setError("Invalid or expired code — check your authenticator app and try again.");
      setTotpCode("");
    } finally {
      setLoading(false);
    }
  }

  function storeTokens(data: { access_token: string; refresh_token?: string }) {
    setAccessToken(data.access_token);
    localStorage.setItem("access_token", data.access_token);
    if (data.refresh_token) {
      localStorage.setItem("refresh_token", data.refresh_token);
    }
  }

  if (screen === "totp") {
    return (
      <div className="form-page-wrapper">
        <section className="form-page">
          <h1>Two-Factor Authentication</h1>
          <p style={{ color: "#5f6f89" }}>
            Open your authenticator app and enter the 6-digit code for PetRecovery.
          </p>
          {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
          <form onSubmit={handleTotp}>
            <label>
              Authenticator code
              <input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                required
              />
            </label>
            <button type="submit" disabled={loading || totpCode.length !== 6}>
              {loading ? "Verifying…" : "Verify"}
            </button>
          </form>
          <p style={{ marginTop: 16, fontSize: "0.875rem" }}>
            <button
              type="button"
              style={{ background: "none", color: "#0f766e", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
              onClick={() => { setScreen("credentials"); setError(null); setTotpCode(""); }}
            >
              ← Back to login
            </button>
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="form-page-wrapper">
      <section className="form-page">
        <h1>Sign in to PetRecovery</h1>
        {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
        <form onSubmit={handleLogin}>
          <label>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in →"}
          </button>
        </form>

        <div className="info-banner-teal" style={{ marginTop: 20 }}>
          🔒 <div>If you're signing in from a new device or location, you'll be asked to verify with your authenticator app before access is granted.</div>
        </div>

        <p style={{ marginTop: 16, fontSize: "0.875rem", color: "#5f6f89", textAlign: "center" }}>
          No account? <Link to="/register" style={{ fontWeight: 700 }}>Register</Link>
        </p>
      </section>
    </div>
  );
}
