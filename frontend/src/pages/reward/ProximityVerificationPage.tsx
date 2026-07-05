import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../../services/api-client";

interface Reward {
  reward_id: string;
  pet_id: string;
  amount_cents: number;
  status: string;
  proximity_verification: {
    proximity_passed: boolean;
    manual_confirmation_required: boolean;
    pet_identity_passed: boolean;
    owner_identity_passed: boolean;
    all_passed: boolean;
  } | null;
}

type Role = "owner" | "finder" | null;

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This device does not support location services"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000
    });
  });
}

function randomKey(): string {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `key-${Date.now()}-${Math.random()}`;
}

export function ProximityVerificationPage() {
  const { id: rewardId } = useParams<{ id: string }>();
  const [reward, setReward] = useState<Reward | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [identityMethod, setIdentityMethod] = useState<"qr_scan" | "microchip_read">("microchip_read");
  const [identityValue, setIdentityValue] = useState("");

  async function refreshReward() {
    const { data } = await apiClient.get(`/rewards/${rewardId}`);
    setReward(data);
    return data as Reward;
  }

  useEffect(() => {
    if (!rewardId) return;
    refreshReward().catch(() => setError("Could not load this reward"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewardId]);

  async function claimAsFinder() {
    setError(null);
    setBusy(true);
    try {
      await apiClient.post(`/rewards/${rewardId}/claim-as-finder`);
      setRole("finder");
      setMessage("You're now verifying as the finder.");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error === "already_claimed" ? "Someone else already claimed this reward as the finder." : "Failed to claim finder role");
    } finally {
      setBusy(false);
    }
  }

  async function submitLocation(asRole: "owner" | "finder") {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const position = await getCurrentPosition();
      const { data: checkData } = await apiClient.post("/proximity-check", { reward_id: rewardId, role: asRole });
      const { data } = await apiClient.post(`/rewards/${rewardId}/proximity`, {
        role: asRole,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy_meters: position.coords.accuracy,
        nonce: checkData.nonce,
        timestamp: new Date().toISOString(),
        idempotency_key: randomKey()
      });

      if (data.manual_confirmation_required) {
        setMessage("GPS accuracy was too low for an automatic result — a manual confirmation may be needed.");
      } else if (data.proximity_passed) {
        setMessage(`Proximity verified — ${Math.round(data.distance_feet)} ft apart.`);
      } else {
        setMessage(`Not close enough yet — ${Math.round(data.distance_feet)} ft apart (need ≤ 50 ft).`);
      }
      await refreshReward();
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? e.message ?? "Failed to submit location");
    } finally {
      setBusy(false);
    }
  }

  async function submitPetIdentity(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data } = await apiClient.post(`/rewards/${rewardId}/pet-identity`, {
        method: identityMethod,
        value: identityValue
      });
      setMessage(data.pet_identity_passed ? "Pet identity confirmed." : "That didn't match — double-check the QR code or microchip number.");
      await refreshReward();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? "Failed to submit pet identity");
    } finally {
      setBusy(false);
    }
  }

  async function confirmOwnerIdentity() {
    setError(null);
    setBusy(true);
    try {
      await apiClient.post(`/rewards/${rewardId}/owner-identity`);
      setMessage("Owner identity confirmed.");
      await refreshReward();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? "Failed to confirm owner identity");
    } finally {
      setBusy(false);
    }
  }

  if (!reward) return <p className="app-shell">{error ?? "Loading…"}</p>;

  const v = reward.proximity_verification;
  const effectiveRole = role;

  return (
    <section className="app-shell" style={{ maxWidth: 640 }}>
      <Link to={`/pets/${reward.pet_id}`} style={{ display: "inline-block", marginBottom: 20 }}>← Back to pet</Link>

      <div className="section-card">
        <div className="section-title">🔎 Verify &amp; Release Reward</div>
        <p className="form-hint">
          All three checks — proximity, pet identity, and owner identity — must pass before the
          ${(reward.amount_cents / 100).toFixed(2)} reward is released. A partial match never releases funds.
        </p>

        {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
        {message && <p style={{ color: "#0f766e" }}>{message}</p>}

        {v?.all_passed ? (
          <p className="info-banner-green">✓ All checks passed — the reward has been released.</p>
        ) : (
          <>
            <div className="list-row">
              <div className="list-row-left">
                <span className="list-row-icon">📍</span>
                <div className="list-row-name">Proximity (≤ 50 ft)</div>
              </div>
              <span className="status-pill">{v?.proximity_passed ? "✓ Passed" : "Pending"}</span>
            </div>
            <div className="list-row">
              <div className="list-row-left">
                <span className="list-row-icon">🐾</span>
                <div className="list-row-name">Pet identity</div>
              </div>
              <span className="status-pill">{v?.pet_identity_passed ? "✓ Passed" : "Pending"}</span>
            </div>
            <div className="list-row">
              <div className="list-row-left">
                <span className="list-row-icon">🧑</span>
                <div className="list-row-name">Owner identity</div>
              </div>
              <span className="status-pill">{v?.owner_identity_passed ? "✓ Passed" : "Pending"}</span>
            </div>

            {!role && (
              <div className="action-row" style={{ marginTop: 16 }}>
                <button type="button" disabled={busy} onClick={() => setRole("owner")}>I'm the owner</button>
                <button type="button" className="btn-outline" disabled={busy} onClick={claimAsFinder}>I found this pet</button>
              </div>
            )}

            {effectiveRole && !v?.proximity_passed && (
              <div className="action-row" style={{ marginTop: 16 }}>
                <button type="button" disabled={busy} onClick={() => submitLocation(effectiveRole)}>
                  📡 Share my current location
                </button>
              </div>
            )}

            {effectiveRole === "finder" && v?.proximity_passed && !v?.pet_identity_passed && (
              <form onSubmit={submitPetIdentity} style={{ marginTop: 16 }}>
                <label>
                  Identity method
                  <select value={identityMethod} onChange={(e) => setIdentityMethod(e.target.value as "qr_scan" | "microchip_read")}>
                    <option value="microchip_read">Microchip number</option>
                    <option value="qr_scan">QR code (from collar tag)</option>
                  </select>
                </label>
                <label>
                  Value
                  <input value={identityValue} onChange={(e) => setIdentityValue(e.target.value)} required />
                </label>
                <button type="submit" disabled={busy}>Submit</button>
              </form>
            )}

            {effectiveRole === "owner" && v?.proximity_passed && v?.pet_identity_passed && !v?.owner_identity_passed && (
              <div className="action-row" style={{ marginTop: 16 }}>
                <button type="button" disabled={busy} onClick={confirmOwnerIdentity}>Confirm it's me</button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
