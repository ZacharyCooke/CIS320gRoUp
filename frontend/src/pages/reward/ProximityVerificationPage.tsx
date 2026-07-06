import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { apiClient } from "../../services/api-client";

interface RewardStatus {
  reward_id: string;
  status: string;
  proximity_verification: {
    proximity_passed: boolean;
    pet_identity_passed: boolean;
    owner_identity_passed: boolean;
    all_passed: boolean;
  } | null;
}

const POLL_MS = 4000;

export function ProximityVerificationPage() {
  const { id: rewardId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") === "owner" ? "owner" : "finder";

  const [reward, setReward] = useState<RewardStatus | null>(null);
  const [distanceFeet, setDistanceFeet] = useState<number | null>(null);
  const [identityMethod, setIdentityMethod] = useState<"qr_scan" | "microchip_read">("qr_scan");
  const [identityToken, setIdentityToken] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!rewardId) return;
    try {
      const { data } = await apiClient.get(`/rewards/${rewardId}`);
      setReward(data);
    } catch {
      setError("Could not load reward status.");
    }
  }, [rewardId]);

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [refresh]);

  async function submitLocation() {
    if (!rewardId) return;
    setError(null);
    setStatus("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { data: nonceData } = await apiClient.post("/proximity-check", { reward_id: rewardId, role });
          const { data } = await apiClient.post(`/rewards/${rewardId}/proximity`, {
            role,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            nonce: nonceData.nonce,
            accuracy_meters: position.coords.accuracy
          });
          setDistanceFeet(data.distance_feet);
          setStatus(data.proximity_passed ? "Proximity confirmed!" : "Location submitted — waiting on the other party.");
          await refresh();
        } catch (err: unknown) {
          const e = err as { response?: { data?: { error?: string } } };
          setError(e.response?.data?.error ?? "Could not submit location");
          setStatus(null);
        }
      },
      () => {
        setError("Location permission denied or unavailable.");
        setStatus(null);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submitPetIdentity(event: React.FormEvent) {
    event.preventDefault();
    if (!rewardId) return;
    setError(null);
    try {
      await apiClient.post(`/rewards/${rewardId}/proximity`, {
        role,
        pet_identity_method: identityMethod,
        pet_identity_token: identityToken
      });
      setStatus("Pet identity confirmed.");
      await refresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? "Identity did not match");
    }
  }

  async function confirmOwnerIdentity() {
    if (!rewardId) return;
    setError(null);
    try {
      await apiClient.post(`/rewards/${rewardId}/proximity`, { role: "owner", confirm_owner_identity: true });
      setStatus("Owner identity confirmed.");
      await refresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? "Could not confirm owner identity");
    }
  }

  const verification = reward?.proximity_verification;
  const ringColor = verification?.proximity_passed ? "#16a34a" : distanceFeet != null ? "#d97706" : "#9ca3af";

  return (
    <section style={{ maxWidth: 480, margin: "0 auto", padding: "1rem", textAlign: "center" }}>
      <Link to="/dashboard">← Dashboard</Link>
      <h1>Proximity Verification</h1>
      <p style={{ color: "#6b7280" }}>Signed in as: <strong>{role}</strong></p>

      <div style={{
        width: 160, height: 160, borderRadius: "50%", margin: "1.5rem auto",
        border: `10px solid ${ringColor}`, display: "flex", alignItems: "center", justifyContent: "center",
        transition: "border-color 0.3s"
      }}>
        <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>
          {distanceFeet != null ? `${distanceFeet.toFixed(0)} ft` : "—"}
        </span>
      </div>

      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
      {status && <p style={{ color: "#374151" }}>{status}</p>}

      <div style={{ textAlign: "left", margin: "1.5rem 0" }}>
        <h3>3-step checklist</h3>
        <ChecklistItem label="GPS proximity (within 50 ft)" done={verification?.proximity_passed ?? false} />
        <ChecklistItem label="Pet identity confirmed" done={verification?.pet_identity_passed ?? false} />
        <ChecklistItem label="Owner identity confirmed" done={verification?.owner_identity_passed ?? false} />
      </div>

      {!verification?.all_passed && (
        <>
          <button type="button" onClick={submitLocation} style={{ marginBottom: 12 }}>
            Submit my location
          </button>

          {verification?.proximity_passed && !verification.pet_identity_passed && (
            <form onSubmit={submitPetIdentity} style={{ marginTop: 12 }}>
              <h3>Confirm pet identity</h3>
              <select value={identityMethod} onChange={(e) => setIdentityMethod(e.target.value as typeof identityMethod)}>
                <option value="qr_scan">QR code token</option>
                <option value="microchip_read">Microchip number</option>
              </select>
              <input
                value={identityToken}
                onChange={(e) => setIdentityToken(e.target.value)}
                placeholder={identityMethod === "qr_scan" ? "Scanned QR token" : "Microchip number"}
                required
              />
              <button type="submit">Confirm</button>
            </form>
          )}

          {verification?.proximity_passed && verification.pet_identity_passed && !verification.owner_identity_passed && role === "owner" && (
            <button type="button" onClick={confirmOwnerIdentity}>Confirm my identity</button>
          )}
        </>
      )}

      {reward?.status === "released" && (
        <p style={{ color: "green", fontWeight: 700, fontSize: "1.1rem" }}>
          🎉 All verifications passed — the reward has been released!
        </p>
      )}
    </section>
  );
}

function ChecklistItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
      <span style={{ color: done ? "#16a34a" : "#9ca3af" }}>{done ? "✅" : "⬜"}</span>
      <span>{label}</span>
    </div>
  );
}
