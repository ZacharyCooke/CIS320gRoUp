import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { ErrorState } from "../../components/ErrorState";

interface Props {
  petId: string;
  petName: string;
  onClose: () => void;
}

export function MarkLostModal({ petId, petName, onClose }: Props) {
  const navigate = useNavigate();
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState(10);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function autoFillGPS() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setError("Could not get GPS location. Enter coordinates manually.");
        setLocating(false);
      }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const centerLat = parseFloat(lat);
    const centerLng = parseFloat(lng);
    if (isNaN(centerLat) || isNaN(centerLng)) {
      setError("Enter valid latitude and longitude.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await apiClient.post(`/pets/${petId}/mark-lost`, {
        center_lat: centerLat,
        center_lng: centerLng,
        radius_miles: radius
      });
      navigate(`/searches/${data.search.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? "Failed to start search.");
      setSubmitting(false);
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <h2>Mark {petName} as Lost</h2>

        <button type="button" onClick={autoFillGPS} disabled={locating}>
          {locating ? "Getting location…" : "Use my GPS location"}
        </button>

        <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
          <label>
            Latitude
            <input value={lat} onChange={(e) => setLat(e.target.value)} required placeholder="e.g. 30.2672" />
          </label>
          <label>
            Longitude
            <input value={lng} onChange={(e) => setLng(e.target.value)} required placeholder="e.g. -97.7431" />
          </label>
          <label>
            Search radius: {radius} miles
            <input
              type="range" min={1} max={500} value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            />
          </label>

          {error && <ErrorState message={error} />}

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button type="submit" disabled={submitting}>
              {submitting ? "Starting search…" : "Start Search"}
            </button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
};
const modal: React.CSSProperties = {
  background: "#fff", borderRadius: 8, padding: "2rem",
  minWidth: 320, display: "flex", flexDirection: "column", gap: "0.5rem"
};
