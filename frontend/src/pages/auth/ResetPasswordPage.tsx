import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { AuthLayout } from "../../components/AuthLayout";
import { ErrorState } from "../../components/ErrorState";

// Mirrors RegisterPage's strength meter (FR-030's 12+ char rule) — a UX
// nudge, not a security control; the server is the real source of truth.
function passwordStrength(password: string): { pct: number; label: string; color: string } {
  if (password.length === 0) return { pct: 0, label: "", color: "#e2e8f0" };
  if (password.length < 12) return { pct: 33, label: "Too short — needs 12+ characters", color: "#dc2626" };
  if (password.length < 16) return { pct: 66, label: "Good", color: "#d97706" };
  return { pct: 100, label: "Strong", color: "#16a34a" };
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const strength = passwordStrength(password);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await apiClient.post("/auth/reset-password", { token, new_password: password });
      navigate("/login", { state: { passwordReset: true } });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      const code = e.response?.data?.error;
      if (code === "invalid_or_expired_token") {
        setError("This reset link is invalid or has expired — request a new one.");
      } else {
        setError(code ?? e.message ?? "Failed to reset password");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout contentStyle={{ textAlign: "center" }}>
        <h1>Invalid reset link</h1>
        <p style={{ color: "#64748b" }}>This password reset link is missing its token.</p>
        <p style={{ marginTop: 16 }}>
          <Link to="/forgot-password" style={{ fontWeight: 700 }}>Request a new reset link</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1>Choose a new password</h1>

      {error && <div style={{ marginBottom: 8 }}><ErrorState message={error} /></div>}

      <form onSubmit={handleSubmit}>
        <label>
          New password <span style={{ fontWeight: 400, color: "#6b7280" }}>(12+ characters)</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            autoFocus
          />
          {password.length > 0 && (
            <>
              <div style={{ height: 4, borderRadius: 2, background: "#e2e8f0", marginTop: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${strength.pct}%`, background: strength.color, borderRadius: 2, transition: "width 0.15s" }} />
              </div>
              <span style={{ fontWeight: 400, fontSize: "0.75rem", color: strength.color }}>{strength.label}</span>
            </>
          )}
        </label>

        <label>
          Confirm new password
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            required
            autoComplete="new-password"
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Updating…" : "Reset password →"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.9rem", color: "#64748b" }}>
        <Link to="/login" style={{ fontWeight: 700 }}>← Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
