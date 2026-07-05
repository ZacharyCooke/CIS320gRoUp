import { Link, useSearchParams } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";

export function PremiumCheckoutPage() {
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success") === "true";
  const cancelled = searchParams.get("cancelled") === "true";
  const { user, loading, refetch } = useCurrentUser();

  return (
    <section className="app-shell" style={{ maxWidth: 480 }}>
      <div className="section-card" style={{ textAlign: "center" }}>
        {success && (
          <>
            <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>⭐</div>
            <h1>Checkout complete</h1>
            <p className="page-sub">
              Stripe confirms your subscription — Premium status updates on our side
              within a few seconds once the webhook lands.
            </p>
          </>
        )}
        {cancelled && (
          <>
            <h1>Checkout cancelled</h1>
            <p className="page-sub">No charge was made. You can try again anytime from the Store.</p>
          </>
        )}
        {!success && !cancelled && (
          <>
            <h1>Premium</h1>
            <p className="page-sub">Manage your Premium subscription from the Store page.</p>
          </>
        )}

        {!loading && (
          <p style={{ margin: "16px 0" }}>
            Current status:{" "}
            <span className={`badge ${user?.is_premium ? "badge-safe" : ""}`}>
              {user?.is_premium ? "Premium active" : "Not yet active"}
            </span>
          </p>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
          <button type="button" className="btn-outline" onClick={refetch}>
            Refresh status
          </button>
          <Link to="/dashboard">
            <button type="button">Go to Dashboard</button>
          </Link>
        </div>
        <p style={{ marginTop: 16 }}>
          <Link to="/store">← Back to Store</Link>
        </p>
      </div>
    </section>
  );
}
