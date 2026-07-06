import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../../services/api-client";

interface RewardStatus {
  reward_id: string;
  pet_id: string;
  amount_cents: number;
  status: string;
  proximity_verification: {
    proximity_passed: boolean;
    pet_identity_passed: boolean;
    owner_identity_passed: boolean;
    all_passed: boolean;
  } | null;
}

const PRESETS_DOLLARS = [50, 100, 250, 500];

const NATIVE_PROVIDERS = [
  { key: "apple_pay", label: "Apple Pay" },
  { key: "google_pay", label: "Google Pay" }
] as const;

const MANUAL_PROVIDERS = [
  { key: "paypal", label: "PayPal" },
  { key: "venmo", label: "Venmo" },
  { key: "zelle", label: "Zelle" },
  { key: "cashapp", label: "Cash App" }
] as const;

function storageKey(petId: string): string {
  return `reward_pet_${petId}`;
}

export function RewardSetupPage() {
  const { id: petId } = useParams<{ id: string }>();
  const [reward, setReward] = useState<RewardStatus | null>(null);
  const [amountDollars, setAmountDollars] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!petId) return;
    const existingId = localStorage.getItem(storageKey(petId));
    if (!existingId) {
      setLoading(false);
      return;
    }
    apiClient
      .get(`/rewards/${existingId}`)
      .then(({ data }) => setReward(data))
      .catch(() => localStorage.removeItem(storageKey(petId)))
      .finally(() => setLoading(false));
  }, [petId]);

  async function createReward() {
    if (!petId) return;
    setError(null);
    try {
      const { data } = await apiClient.post("/rewards", {
        pet_id: petId,
        amount_cents: Math.round(amountDollars * 100)
      });
      localStorage.setItem(storageKey(petId), data.reward_id);
      const full = await apiClient.get(`/rewards/${data.reward_id}`);
      setReward(full.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? "Could not create reward");
    }
  }

  async function fund(paymentSource: string) {
    if (!reward) return;
    setError(null);
    try {
      await apiClient.post(`/rewards/${reward.reward_id}/fund`, { payment_source: paymentSource });
      const full = await apiClient.get(`/rewards/${reward.reward_id}`);
      setReward(full.data);
      setMessage(
        NATIVE_PROVIDERS.some((p) => p.key === paymentSource)
          ? "Escrow funded."
          : "Thanks — we've recorded your transfer. Escrow is now marked funded."
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? "Could not fund reward");
    }
  }

  async function cancel() {
    if (!reward || !petId) return;
    setError(null);
    try {
      await apiClient.post(`/rewards/${reward.reward_id}/cancel`);
      localStorage.removeItem(storageKey(petId));
      setReward(null);
      setMessage("Reward cancelled and any escrowed funds refunded.");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? "Could not cancel reward");
    }
  }

  if (loading) return <p>Loading…</p>;

  return (
    <section style={{ maxWidth: 480, margin: "0 auto", padding: "1rem" }}>
      <Link to={`/pets/${petId}`}>← Back to profile</Link>
      <h1>Reward Escrow</h1>

      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
      {message && <p style={{ color: "green" }}>{message}</p>}

      {!reward ? (
        <>
          <p>Set a reward for your pet's safe return. Funds are held in escrow and released automatically once the finder is verified.</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {PRESETS_DOLLARS.map((amt) => (
              <button key={amt} type="button" onClick={() => setAmountDollars(amt)}
                style={{ fontWeight: amountDollars === amt ? 700 : 400 }}>
                ${amt}
              </button>
            ))}
          </div>
          <label>
            Amount ($)
            <input
              type="number" min={1} step={1} value={amountDollars}
              onChange={(e) => setAmountDollars(Number(e.target.value))}
            />
          </label>
          <div style={{ marginTop: 12 }}>
            <button type="button" onClick={createReward}>Continue to funding</button>
          </div>
        </>
      ) : (
        <>
          <p>Reward amount: <strong>${(reward.amount_cents / 100).toFixed(2)}</strong></p>
          <p>Status: <strong>{reward.status}</strong></p>

          {reward.status === "pending_funding" && (
            <>
              <h3>Fund escrow</h3>
              <p style={{ fontSize: "0.85em", color: "#4b5563" }}>Apple Pay / Google Pay fund escrow immediately. Other providers require a manual transfer you confirm below.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[...NATIVE_PROVIDERS, ...MANUAL_PROVIDERS].map((p) => (
                  <button key={p.key} type="button" onClick={() => fund(p.key)}>{p.label}</button>
                ))}
              </div>
            </>
          )}

          {reward.status !== "pending_funding" && reward.status !== "cancelled" && reward.status !== "refunded" && (
            <>
              <h3>Verification status</h3>
              <ul>
                <li>GPS proximity: {reward.proximity_verification?.proximity_passed ? "✅" : "⏳"}</li>
                <li>Pet identity: {reward.proximity_verification?.pet_identity_passed ? "✅" : "⏳"}</li>
                <li>Owner identity: {reward.proximity_verification?.owner_identity_passed ? "✅" : "⏳"}</li>
              </ul>
              {reward.status === "released" ? (
                <p style={{ color: "green", fontWeight: 600 }}>Reward released to the finder — welcome home!</p>
              ) : (
                <Link to={`/rewards/${reward.reward_id}/proximity?role=owner`}>
                  <button type="button">Open proximity verification</button>
                </Link>
              )}
            </>
          )}

          {reward.status !== "released" && reward.status !== "cancelled" && reward.status !== "refunded" && (
            <div style={{ marginTop: 12 }}>
              <button type="button" style={{ color: "red" }} onClick={cancel}
                disabled={reward.status === "verification_in_progress"}>
                Cancel reward
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
