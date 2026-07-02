import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, setAccessToken } from "../../services/api-client";

export function VerifyContactPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        sessionStorage.removeItem("pending_user_id");
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
    <section className="form-page">
      <h1>Verify your contact information</h1>
      <p>Enter the 6-digit code sent to your email.</p>
      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          6-digit code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            required
          />
        </label>
        <button type="submit" disabled={loading}>{loading ? "Verifying…" : "Verify & Continue"}</button>
      </form>
    </section>
  );
}
