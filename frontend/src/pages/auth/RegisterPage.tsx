import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api-client";

function useMathCaptcha() {
  const a = useMemo(() => Math.floor(Math.random() * 9) + 1, []);
  const b = useMemo(() => Math.floor(Math.random() * 9) + 1, []);
  return { a, b, answer: a + b };
}

// Purely a UX nudge reflecting the real backend rule (12+ chars, FR-030) —
// not a security control on its own.
function passwordStrength(password: string): { pct: number; label: string; color: string } {
  if (password.length === 0) return { pct: 0, label: "", color: "#e2e8f0" };
  if (password.length < 12) return { pct: 33, label: "Too short — needs 12+ characters", color: "#dc2626" };
  if (password.length < 16) return { pct: 66, label: "Good", color: "#d97706" };
  return { pct: 100, label: "Strong", color: "#16a34a" };
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { a, b, answer } = useMathCaptcha();
  const strength = passwordStrength(password);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (parseInt(captchaInput, 10) !== answer) {
      setError("Incorrect answer — please try again.");
      setCaptchaInput("");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post("/auth/register", {
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        email,
        password,
        phone: phone || undefined
      });
      sessionStorage.setItem("pending_user_id", data.user_id);
      sessionStorage.setItem("pending_email", email);
      if (data._dev_otp?.email) {
        sessionStorage.setItem("dev_otp_email", data._dev_otp.email);
      } else {
        sessionStorage.removeItem("dev_otp_email");
      }
      navigate("/verify");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      const code = e.response?.data?.error;
      if (code === "email_already_registered") {
        setError("An account with this email already exists — try signing in instead.");
      } else {
        setError(code ?? e.message ?? "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form-page-wrapper">
      <section className="form-page">
        <span className="tag tag-teal" style={{ display: "inline-block", marginBottom: 12 }}>🐾 Free Account</span>
        <h1>Create your PetRecovery account</h1>
        <p style={{ color: "#6b7280", marginTop: -16, marginBottom: 20, fontSize: "0.9rem" }}>
          Register in a few minutes — protect your pets before anything happens.
        </p>

        {error && <p role="alert" style={{ color: "#dc2626", marginBottom: 8 }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: "12px" }}>
            <label style={{ flex: 1 }}>
              First name
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </label>
            <label style={{ flex: 1 }}>
              Last name
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </label>
          </div>

          <label>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="email"
            />
            <span style={{ fontWeight: 400, fontSize: "0.78rem", color: "#94a3b8" }}>
              A verification code will be sent to this address.
            </span>
          </label>

          <label>
            Phone <span style={{ fontWeight: 400, color: "#6b7280" }}>(optional)</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              autoComplete="tel"
            />
          </label>

          <label>
            Password <span style={{ fontWeight: 400, color: "#6b7280" }}>(12+ characters)</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
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
            Confirm password
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              required
              autoComplete="new-password"
            />
          </label>

          <label>
            Verify you&apos;re human
            <div className="captcha-box">
              <span className="captcha-label">What is {a} + {b}?</span>
              <input
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                type="number"
                placeholder="?"
                required
                min={0}
                max={99}
              />
            </div>
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Registering…" : "Create Account →"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.9rem", color: "#64748b" }}>
          Already have an account? <Link to="/login" style={{ fontWeight: 700 }}>Sign in</Link>
        </p>
      </section>
    </div>
  );
}
