import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api-client";

function useMathCaptcha() {
  const a = useMemo(() => Math.floor(Math.random() * 9) + 1, []);
  const b = useMemo(() => Math.floor(Math.random() * 9) + 1, []);
  return { a, b, answer: a + b };
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { a, b, answer } = useMathCaptcha();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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
      navigate("/verify");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error ?? e.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form-page-wrapper">
      <section className="form-page">
        <h1>Create your PetRecovery account</h1>

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
            {loading ? "Registering…" : "Register"}
          </button>
        </form>
      </section>
    </div>
  );
}
