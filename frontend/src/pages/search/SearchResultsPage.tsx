import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { connectToSearch, disconnectSearch } from "../../services/websocket.client";

interface SearchResult {
  id: string;
  source: string;
  name: string | null;
  species: string | null;
  breed: string | null;
  color: string | null;
  photo_url: string | null;
  lat: number | null;
  lng: number | null;
  distance_miles: number | null;
  description: string | null;
  contact_info: string | null;
  source_url: string | null;
  found_at: string | null;
}

interface Search {
  id: string;
  pet_id: string;
  status: string;
  center_lat: number;
  center_lng: number;
  radius_miles: number;
}

interface VetBolo {
  id: string;
  clinic_name: string;
  clinic_address: string | null;
  distance_miles: number | null;
  email_status: string;
}

export function SearchResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState<Search | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [vetBolos, setVetBolos] = useState<VetBolo[]>([]);
  const [complete, setComplete] = useState(false);
  const [radius, setRadius] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markers = useRef<any[]>([]);

  useEffect(() => {
    if (!id) return;

    apiClient.get(`/searches/${id}/results`).then(({ data }) => {
      setSearch(data.search);
      setRadius(data.search.radius_miles);
      setResults(data.results ?? []);
    }).catch(() => setError("Search not found."));

    apiClient.get(`/searches/${id}/vet-bolos`).then(({ data }) => {
      setVetBolos(data.vet_bolos ?? []);
    }).catch(() => {});

    const socket = connectToSearch(id);
    socket.on("new_result", (result: SearchResult) => {
      setResults((prev) => [...prev, result]);
    });
    socket.on("search_complete", () => setComplete(true));
    socket.on("vet_bolo_sent", (bolo: { clinic_name: string; email_status: string }) => {
      setVetBolos((prev) => [
        ...prev,
        {
          id: `${bolo.clinic_name}-${prev.length}`,
          clinic_name: bolo.clinic_name,
          clinic_address: null,
          distance_miles: null,
          email_status: bolo.email_status
        }
      ]);
    });

    return () => disconnectSearch();
  }, [id]);

  // Lazy-load Leaflet to avoid SSR issues
  useEffect(() => {
    if (!mapRef.current || !search) return;
    import("leaflet").then((L) => {
      if (leafletMap.current) return;
      leafletMap.current = L.map(mapRef.current!).setView(
        [search.center_lat, search.center_lng], 11
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
      }).addTo(leafletMap.current);
      L.circle([search.center_lat, search.center_lng], {
        radius: search.radius_miles * 1609.34, color: "#3b82f6", fillOpacity: 0.1
      }).addTo(leafletMap.current);
    });
  }, [search]);

  useEffect(() => {
    if (!leafletMap.current) return;
    import("leaflet").then((L) => {
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      results.forEach((r) => {
        if (r.lat != null && r.lng != null) {
          const m = L.marker([r.lat, r.lng])
            .bindPopup(`<b>${r.name ?? "Unknown"}</b><br/>${r.source}`)
            .addTo(leafletMap.current);
          markers.current.push(m);
        }
      });
    });
  }, [results]);

  async function adjustRadius() {
    if (!id) return;
    await apiClient.patch(`/searches/${id}`, { radius_miles: radius });
    setSearch((s) => s ? { ...s, radius_miles: radius } : s);
  }

  async function closeSearch() {
    if (!id || !search) return;
    await apiClient.post(`/pets/${search.pet_id}/mark-recovered`);
    navigate("/dashboard");
  }

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!search) return <p>Loading…</p>;

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Search Results {complete ? "(complete)" : "(searching…)"}</h2>

      <div ref={mapRef} style={{ height: 360, width: "100%", marginBottom: "1rem" }} />

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" }}>
        <label>
          Radius: {radius} mi
          <input type="range" min={1} max={500} value={radius}
            onChange={(e) => setRadius(Number(e.target.value))} />
        </label>
        <button type="button" onClick={adjustRadius}>Update radius</button>
        <button type="button" onClick={closeSearch} style={{ marginLeft: "auto", color: "red" }}>
          Mark recovered
        </button>
      </div>

      <p>{results.length} result{results.length !== 1 ? "s" : ""} found</p>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {results.map((r) => (
          <li key={r.id} style={card}>
            {r.photo_url && <img src={r.photo_url} alt={r.name ?? ""} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 4 }} />}
            <div>
              <strong>{r.name ?? "Unknown"}</strong>
              {r.distance_miles != null && <span> — {r.distance_miles.toFixed(1)} mi away</span>}
              <div style={{ fontSize: "0.85rem", color: "#555" }}>
                {[r.species, r.breed, r.color].filter(Boolean).join(" · ")}
              </div>
              {r.description && <p style={{ margin: "0.25rem 0" }}>{r.description.slice(0, 120)}</p>}
              {r.source_url && <a href={r.source_url} target="_blank" rel="noreferrer">View on {r.source}</a>}
            </div>
          </li>
        ))}
      </ul>

      <h3>Vet Clinics Notified ({vetBolos.length})</h3>
      {vetBolos.length === 0 ? (
        <p style={{ color: "#555" }}>No nearby vet clinics notified yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {vetBolos.map((v) => (
            <li key={v.id} style={card}>
              <div>
                <strong>{v.clinic_name}</strong>
                <span style={{ marginLeft: "0.5rem", color: statusColor(v.email_status) }}>
                  {v.email_status}
                </span>
                {v.distance_miles != null && <span> — {v.distance_miles.toFixed(1)} mi away</span>}
                {v.clinic_address && (
                  <div style={{ fontSize: "0.85rem", color: "#555" }}>{v.clinic_address}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function statusColor(status: string): string {
  if (status === "sent") return "#16a34a";
  if (status === "bounced") return "#ea580c";
  return "#6b7280";
}

const card: React.CSSProperties = {
  display: "flex", gap: "0.75rem", padding: "0.75rem",
  border: "1px solid #e5e7eb", borderRadius: 6, marginBottom: "0.5rem"
};
