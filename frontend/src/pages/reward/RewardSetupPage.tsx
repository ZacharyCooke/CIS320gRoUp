import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { Spinner } from "../../components/Spinner";
import { ErrorState } from "../../components/ErrorState";

interface Reward {
  id: string;
  pet_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  payment_source: string | null;
  payment_channel: string | null;
}

interface Pet {
  id: string;
  name: string;
  status: string;
}

const MANUAL_CHANNELS: Record<string, string> = {
  paypal: "PayPal",
  venmo: "Venmo",
  zelle: "Zelle",
  cashapp: "Cash App"
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_funding: { label: "Awaiting funding", color: "#d97706" },
  funded: { label: "Funded — ready to verify", color: "#0f766e" },
  verification_in_progress: { label: "Verification in progress", color: "#0f766e" },
  released: { label: "Released to finder", color: "#16a34a" },
  refunded: { label: "Refunded", color: "#64748b" },
  cancelled: { label: "Cancelled", color: "#64748b" }
};

function randomKey(): string {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `key-${Date.now()}-${Math.random()}`;
}

export function RewardSetupPage() {
  const { id: petId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pet, setPet] = useState<Pet | null>(null);
  const [reward, setReward] = useState<Reward | null | undefined>(undefined);
  const [amountDollars, setAmountDollars] = useState("50");
  const [channel, setChannel] = useState("paypal");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function loadPetAndReward() {
    if (!petId) return;
    setLoadError(null);
    apiClient
      .get(`/pets/${petId}`)
      .then(({ data }) => setPet(data.pet))
      .catch(() => setLoadError("Could not load this pet"));
    apiClient.get(`/pets/${petId}/reward`).then(({ data }) => setReward(data.reward)).catch(() => setReward(null));
  }

  useEffect(() => {
    loadPetAndReward();
  }, [petId]);

  async function createReward(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const amount_cents = Math.round(parseFloat(amountDollars) * 100);
      const { data } = await apiClient.post("/rewards", {
        pet_id: petId,
        amount_cents,
        idempotency_key: randomKey()
      });
      setReward({
        id: data.reward_id,
        pet_id: petId!,
        amount_cents: data.amount_cents,
        currency: "USD",
        status: data.status,
        payment_source: null,
        payment_channel: null
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? "Failed to create reward");
    } finally {
      setBusy(false);
    }
  }

  async function fundReward(event: React.FormEvent) {
    event.preventDefault();
    if (!reward) return;
    setError(null);
    setBusy(true);
    try {
      const { data } = await apiClient.post(`/rewards/${reward.id}/fund`, {
        payment_source: "manual_confirm",
        payment_channel: channel,
        idempotency_key: randomKey()
      });
      setReward({ ...reward, status: data.status, payment_source: "manual_confirm", payment_channel: channel });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? "Failed to record funding");
    } finally {
      setBusy(false);
    }
  }

  async function cancelReward() {
    if (!reward) return;
    setError(null);
    setBusy(true);
    try {
      const { data } = await apiClient.post(`/rewards/${reward.id}/cancel`, { idempotency_key: randomKey() });
      setReward({ ...reward, status: data.status });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? "Failed to cancel reward");
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <section className="app-shell">
        <ErrorState message={loadError} onRetry={loadPetAndReward} />
      </section>
    );
  }

  if (!pet || reward === undefined) {
    return (
      <section className="app-shell">
        <Spinner label="Loading reward details…" />
      </section>
    );
  }

  const statusInfo = reward ? STATUS_LABELS[reward.status] ?? { label: reward.status, color: "#64748b" } : null;

  return (
    <section className="app-shell" style={{ maxWidth: 640 }}>
      <Link to={`/pets/${petId}`} style={{ display: "inline-block", marginBottom: 20 }}>← Back to {pet.name}</Link>

      <div className="section-card">
        <div className="section-title">💰 Reward for {pet.name}</div>

        {error && <ErrorState message={error} />}

        {!reward && (
          <form onSubmit={createReward}>
            <label>
              Reward amount (USD)
              <input
                type="number"
                min="1"
                step="1"
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
                required
              />
            </label>
            <p className="form-hint">
              Funds are held in escrow and only released once proximity, pet identity, and owner
              identity are all verified — never on a partial match.
            </p>
            <button type="submit" disabled={busy}>Create reward</button>
          </form>
        )}

        {reward && (
          <>
            <div className="list-row">
              <div className="list-row-left">
                <span className="list-row-icon">💵</span>
                <div>
                  <div className="list-row-name">${(reward.amount_cents / 100).toFixed(2)} {reward.currency}</div>
                  <div className="list-row-sub">
                    {reward.payment_channel ? `via ${MANUAL_CHANNELS[reward.payment_channel] ?? reward.payment_channel}` : "Not yet funded"}
                  </div>
                </div>
              </div>
              <span className="status-pill" style={{ color: statusInfo?.color }}>● {statusInfo?.label}</span>
            </div>

            {reward.status === "pending_funding" && (
              <form onSubmit={fundReward} style={{ marginTop: 16 }}>
                <label>
                  How did you send the funds?
                  <select value={channel} onChange={(e) => setChannel(e.target.value)}>
                    {Object.entries(MANUAL_CHANNELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <p className="form-hint">
                  Apple Pay / Google Pay (processed automatically via Stripe) are coming soon —
                  for now, send funds directly and confirm the method here.
                </p>
                <button type="submit" disabled={busy}>I've sent the funds</button>
              </form>
            )}

            {(reward.status === "funded" || reward.status === "verification_in_progress") && (
              <div className="action-row" style={{ marginTop: 16 }}>
                <button type="button" onClick={() => navigate(`/rewards/${reward.id}/verify`)}>
                  🔎 Verify &amp; release reward
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={cancelReward}
                  disabled={busy || reward.status === "verification_in_progress"}
                >
                  Cancel reward
                </button>
              </div>
            )}

            {reward.status === "released" && (
              <p className="info-banner-green" style={{ marginTop: 16 }}>
                ✓ All verification steps passed — the reward has been released to the finder.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
