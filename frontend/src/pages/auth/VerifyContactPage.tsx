import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, setAccessToken } from "../../services/api-client";
import { ErrorState } from "../../components/ErrorState";

// Mirrors the real server-side OTP_TTL_MS (10 minutes) in user.service.ts —
// informational only, the server is still the actual source of truth for
// whether a code has expired.
const OTP_TTL_SECONDS = 10 * 60;

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VerifyContactPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);
  const devOtp = sessionStorage.getItem("dev_otp_email");
  const email = sessionStorage.getItem("pending_email");

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const user_id = sessionStorage.getItem("pending_user_id");
    if (!user_id) {
      setError("Session expired — please register again.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.post("/auth/verify-contact", {
        user_id,
        channel: "email",
        code
      });
      if (data.access_token) {
        setAccessToken(data.access_token);
        localStorage.setItem("access_token", data.access_token);
        if (data.refresh_token) {
          localStorage.setItem("refresh_token", data.refresh_token);
        }
        sessionStorage.removeItem("pending_user_id");
        sessionStorage.removeItem("pending_email");
        sessionStorage.removeItem("dev_otp_email");
      }
      navigate("/dashboard");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error ?? "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form-page-wrapper">
    <section className="form-page" style={{ textAlign: "center" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📧</div>
      <h1>Check your email</h1>
      <p style={{ color: "#64748b", marginBottom: email ? 4 : 16 }}>We sent a 6-digit verification code to</p>
      {email && <p style={{ color: "#0f766e", fontWeight: 700, marginBottom: 16 }}>{email}</p>}
      {devOtp && (
        <p style={{ background: "#fef3c7", color: "#92400e", padding: "8px 12px", borderRadius: 8, textAlign: "left" }}>
          Dev mode (no email provider configured): your code is <strong>{devOtp}</strong>
        </p>
      )}
      {error && <ErrorState message={error} />}
      <form onSubmit={handleSubmit}>
        <label>
          6-digit code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            required
            autoFocus
            style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.3em", fontWeight: 700 }}
          />
        </label>
        <button type="submit" disabled={loading}>{loading ? "Verifying…" : "Verify & Continue →"}</button>
      </form>
      <p style={{ marginTop: 16, fontSize: "0.8rem", color: "#94a3b8" }}>
        {secondsLeft > 0 ? `Code expires in ${formatCountdown(secondsLeft)}` : "Code may have expired — try registering again if it doesn't work."}
      </p>
    </section>
    </div>
  );
}
