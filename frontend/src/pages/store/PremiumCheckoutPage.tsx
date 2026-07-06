import { useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/api-client";

export function PremiumCheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post("/store/subscribe");
      window.location.href = data.checkout_url;
    } catch {
      setError("Could not start checkout. Please try again.");
      setLoading(false);
    }
  }

  return (
    <section style={{ padding: "1.5rem", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <Link to="/store">← Store</Link>
      <h1>PetRecovery Premium</h1>
      <ul style={{ textAlign: "left", display: "inline-block", margin: "1rem 0" }}>
        <li>No ads, anywhere in the app</li>
        <li>Unlimited pet profiles</li>
        <li>Priority multi-source search</li>
        <li>Auto-post found reports to your Facebook groups</li>
      </ul>
      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
      <div>
        <button type="button" onClick={startCheckout} disabled={loading}>
          {loading ? "Redirecting to checkout…" : "Subscribe with Stripe"}
        </button>
      </div>
    </section>
  );
}
