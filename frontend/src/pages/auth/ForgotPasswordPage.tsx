import { useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { AuthLayout } from "../../components/AuthLayout";
import { ErrorState } from "../../components/ErrorState";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiClient.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch {
      // The endpoint itself never reveals whether the email exists; a
      // thrown error here means the request itself failed (network,
      // validation), not that the account wasn't found.
      setError("Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <AuthLayout contentStyle={{ textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📧</div>
        <h1>Check your email</h1>
        <p style={{ color: "#64748b" }}>
          If an account exists for <strong>{email}</strong>, we've sent a link to reset your password. It expires in
          30 minutes.
        </p>
        <p style={{ marginTop: 16, fontSize: "0.9rem" }}>
          <Link to="/login" style={{ fontWeight: 700 }}>← Back to sign in</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1>Reset your password</h1>
      <p style={{ color: "#6b7280", marginTop: -16, marginBottom: 20, fontSize: "0.9rem" }}>
        Enter your account email and we'll send you a link to reset your password.
      </p>

      {error && <div style={{ marginBottom: 8 }}><ErrorState message={error} /></div>}

      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="email"
            autoFocus
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Sending…" : "Send reset link →"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.9rem", color: "#64748b" }}>
        <Link to="/login" style={{ fontWeight: 700 }}>← Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
