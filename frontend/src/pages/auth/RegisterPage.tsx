import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api-client";

export function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post("/auth/register", {
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
    <section className="form-page">
      <h1>Create your PetRecovery account</h1>
      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={12}
          />
        </label>
        <button type="submit" disabled={loading}>{loading ? "Registering…" : "Register"}</button>
      </form>
    </section>
  );
}
