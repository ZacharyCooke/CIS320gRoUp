import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { MarkLostModal } from "../search/MarkLostModal";

interface MedicalCondition {
  condition: string;
  share_publicly: boolean;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  color: string;
  size: string;
  status: string;
  temperament: string;
  approach_notes: string | null;
  medical_conditions: MedicalCondition[];
  medical_emergency_notes: string | null;
  share_emergency_notes: boolean;
}

interface Vet {
  clinic_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

const TEMPERAMENT_LABELS: Record<string, { label: string; color: string }> = {
  friendly: { label: "Friendly", color: "#16a34a" },
  cautious: { label: "Cautious", color: "#d97706" },
  report_only: { label: "Report Only — Do Not Approach", color: "#dc2626" }
};

export function PetProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [vet, setVet] = useState<Vet | null>(null);
  const [qr, setQr] = useState<{ png_data_url: string; profile_url: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deviceUrl, setDeviceUrl] = useState("");
  const [deviceType, setDeviceType] = useState("airtag");
  const [sourceType, setSourceType] = useState("petfinder_api");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showMarkLost, setShowMarkLost] = useState(false);

  useEffect(() => {
    if (!id) return;
    setPet(null);
    setVet(null);
    setQr(null);
    setLoadError(null);
    apiClient
      .get(`/pets/${id}`)
      .then(({ data }) => setPet(data.pet))
      .catch(() => setLoadError("Could not load pet profile"));
    apiClient
      .get(`/pets/${id}/vet`)
      .then(({ data }) => setVet(data.vet))
      .catch(() => {});
    apiClient
      .get(`/pets/${id}/qr`)
      .then(({ data }) => setQr({ png_data_url: data.png_data_url, profile_url: data.profile_url }))
      .catch(() => {});
  }, [id]);

  async function rotateQr() {
    setActionMsg(null);
    setActionError(null);
    try {
      await apiClient.post(`/pets/${id}/rotate-qr`);
      const { data } = await apiClient.get(`/pets/${id}/qr`);
      setQr({ png_data_url: data.png_data_url, profile_url: data.profile_url });
      setActionMsg("QR code regenerated. The previous code no longer works.");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setActionError(e.response?.data?.error ?? "Failed to regenerate QR code");
    }
  }

  async function linkDevice(event: React.FormEvent) {
    event.preventDefault();
    setActionMsg(null);
    setActionError(null);
    try {
      await apiClient.post(`/pets/${id}/tracking-devices`, {
        device_type: deviceType,
        share_url: deviceUrl
      });
      setActionMsg("Tracking device linked.");
      setDeviceUrl("");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setActionError(e.response?.data?.error ?? "Failed to link device");
    }
  }

  async function linkSource(event: React.FormEvent) {
    event.preventDefault();
    setActionMsg(null);
    setActionError(null);
    const sourceNames: Record<string, string> = {
      petfinder_api: "PetFinder",
      petfbi_scrape: "PetFBI",
      manual_link: "Manual link",
      facebook_groups: "Facebook Groups"
    };
    const sourceUrls: Record<string, string> = {
      petfinder_api: "https://www.petfinder.com",
      petfbi_scrape: "https://www.petfbi.org",
      manual_link: "https://petrecovery.app",
      facebook_groups: "https://www.facebook.com"
    };
    try {
      await apiClient.post(`/pets/${id}/external-sources`, {
        source_type: sourceType,
        source_name: sourceNames[sourceType] ?? sourceType,
        source_url: sourceUrls[sourceType] ?? "https://petrecovery.app"
      });
      setActionMsg(`${sourceNames[sourceType] ?? sourceType} linked.`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setActionError(e.response?.data?.error ?? "Failed to link source");
    }
  }

  if (loadError) return <p role="alert" style={{ color: "red" }}>{loadError}</p>;
  if (!pet) return <p>Loading…</p>;

  const temperamentInfo = TEMPERAMENT_LABELS[pet.temperament] ?? { label: pet.temperament, color: "#6b7280" };
  const publicConditions = pet.medical_conditions.filter((c) => c.share_publicly);

  return (
    <section>
      {showMarkLost && (
        <MarkLostModal petId={pet.id} petName={pet.name} onClose={() => setShowMarkLost(false)} />
      )}
      <Link to="/dashboard">← Dashboard</Link>
      <h1>{pet.name}</h1>
      <p>{pet.species} · {pet.color} · {pet.size}</p>

      <span style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "999px",
        background: pet.status === "lost" ? "#dc2626" : "#0f766e",
        color: "white",
        fontWeight: 600,
        fontSize: "0.85em",
        marginBottom: "12px"
      }}>
        {pet.status.toUpperCase()}
      </span>

      {pet.status !== "lost" && (
        <div>
          <button type="button" style={{ color: "red" }} onClick={() => setShowMarkLost(true)}>
            Mark as Lost
          </button>
        </div>
      )}

      <h2>Temperament</h2>
      <span style={{
        display: "inline-block",
        padding: "3px 12px",
        borderRadius: "999px",
        background: temperamentInfo.color,
        color: "white",
        fontWeight: 600,
        fontSize: "0.9em"
      }}>
        {temperamentInfo.label}
      </span>
      {pet.approach_notes && (
        <p style={{ marginTop: "8px", fontStyle: "italic" }}>{pet.approach_notes}</p>
      )}

      {publicConditions.length > 0 && (
        <>
          <h2>Medical Conditions</h2>
          <ul>
            {publicConditions.map((c, i) => <li key={i}>{c.condition}</li>)}
          </ul>
          {pet.medical_emergency_notes && pet.share_emergency_notes && (
            <p style={{ background: "#fef2f2", border: "1px solid #fca5a5", padding: "8px", borderRadius: "6px" }}>
              <strong>Emergency note:</strong> {pet.medical_emergency_notes}
            </p>
          )}
        </>
      )}

      {vet && (
        <>
          <h2>Primary Veterinarian</h2>
          <p style={{ background: "#f0fdf4", border: "1px solid #86efac", padding: "10px", borderRadius: "6px" }}>
            <strong>{vet.clinic_name}</strong>
            {vet.address && <><br />{vet.address}</>}
            {vet.phone && <><br />📞 {vet.phone}</>}
            {vet.email && <><br />✉ {vet.email}</>}
          </p>
        </>
      )}

      {qr && (
        <>
          <h2>QR Code</h2>
          <p style={{ color: "#4b5563", fontSize: "0.9em" }}>
            Print this on a collar tag. Anyone who scans it sees {pet.name}&apos;s public profile —
            no app or login required.
          </p>
          <img
            src={qr.png_data_url}
            alt={`QR code for ${pet.name}`}
            style={{ width: 200, height: 200, border: "1px solid #e5e7eb", borderRadius: 8 }}
          />
          <p style={{ fontSize: "0.8em", wordBreak: "break-all" }}>
            <a href={qr.profile_url} target="_blank" rel="noopener noreferrer">{qr.profile_url}</a>
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <a href={qr.png_data_url} download={`${pet.name}-qr.png`}>
              <button type="button">Download PNG</button>
            </a>
            <button type="button" onClick={rotateQr}>Regenerate code</button>
          </div>
        </>
      )}

      {actionMsg && <p style={{ color: "green" }}>{actionMsg}</p>}
      {actionError && <p role="alert" style={{ color: "red" }}>{actionError}</p>}

      <h2>Link Tracking Device</h2>
      <form onSubmit={linkDevice}>
        <label>
          Device type
          <select value={deviceType} onChange={(e) => setDeviceType(e.target.value)}>
            <option value="airtag">AirTag</option>
            <option value="amazon_tag">Amazon Tag</option>
          </select>
        </label>
        <label>
          Share URL
          <input
            value={deviceUrl}
            onChange={(e) => setDeviceUrl(e.target.value)}
            type="url"
            placeholder="https://findmy.apple.com/…"
            required
          />
        </label>
        <button type="submit">Link device</button>
      </form>

      <h2>Link External Source</h2>
      <form onSubmit={linkSource}>
        <label>
          Source
          <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
            <option value="petfinder_api">PetFinder</option>
            <option value="petfbi_scrape">PetFBI</option>
            <option value="facebook_groups">Facebook Groups</option>
            <option value="manual_link">Manual link</option>
          </select>
        </label>
        <button type="submit">Link source</button>
      </form>
    </section>
  );
}
