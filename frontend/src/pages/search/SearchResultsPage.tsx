import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { connectToSearch, disconnectSearch } from "../../services/websocket.client";

interface SearchResult {
  id: string;
  source: string;
  external_id: string | null;
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
  distance_miles: number;
  email_status: "sent" | "bounced" | "failed";
  sent_at: string | null;
}

export function SearchResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState<Search | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [complete, setComplete] = useState(false);
  const [radius, setRadius] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [vetBolos, setVetBolos] = useState<VetBolo[]>([]);
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
    }).catch(() => { /* no vet BOLOs dispatched yet */ });

    const socket = connectToSearch(id);
    socket.on("new_result", (result: SearchResult) => {
      setResults((prev) => [...prev, result]);
    });
    socket.on("search_complete", () => setComplete(true));
    socket.on("vet_bolo_sent", (data: { clinic_name: string; email_status: VetBolo["email_status"] }) => {
      setVetBolos((prev) => [
        ...prev,
        {
          id: `${data.clinic_name}-${prev.length}`,
          clinic_name: data.clinic_name,
          clinic_address: null,
          distance_miles: 0,
          email_status: data.email_status,
          sent_at: new Date().toISOString()
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

  async function claimReport(foundReportId: string) {
    if (!id) return;
    try {
      const { data } = await apiClient.post(`/found-reports/${foundReportId}/claim`, { search_id: id });
      alert(
        data.owner_contact
          ? `Claimed! The finder has been sent your contact info: ${data.owner_contact}`
          : "Claimed! The finder has been notified."
      );
    } catch {
      alert("Could not claim this report — it may already be claimed.");
    }
  }

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!search) return <p>Loading…</p>;

  return (
    <div style={{ padding: "1rem", maxWidth: 900, margin: "0 auto" }}>
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

      {vetBolos.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <h3 style={{ marginBottom: "0.5rem" }}>Vet clinics notified ({vetBolos.length})</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {vetBolos.map((v) => (
              <li key={v.id} style={{ ...card, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <strong>{v.clinic_name}</strong>
                  {v.clinic_address && <div style={{ fontSize: "0.8rem", color: "#555" }}>{v.clinic_address}</div>}
                  {v.distance_miles > 0 && (
                    <div style={{ fontSize: "0.8rem", color: "#555" }}>{v.distance_miles.toFixed(1)} mi away</div>
                  )}
                </div>
                <span style={statusBadge(v.email_status)}>{v.email_status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
              {r.source === "found_report" && r.external_id && (
                <div style={{ marginTop: 6 }}>
                  <button type="button" onClick={() => claimReport(r.external_id!)}>
                    This is my pet — claim it
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const card: React.CSSProperties = {
  display: "flex", gap: "0.75rem", padding: "0.75rem",
  border: "1px solid #e5e7eb", borderRadius: 6, marginBottom: "0.5rem"
};

function statusBadge(status: VetBolo["email_status"]): React.CSSProperties {
  const colors: Record<VetBolo["email_status"], { bg: string; fg: string }> = {
    sent: { bg: "#dcfce7", fg: "#166534" },
    bounced: { bg: "#fee2e2", fg: "#991b1b" },
    failed: { bg: "#f3f4f6", fg: "#4b5563" }
  };
  const c = colors[status];
  return {
    background: c.bg, color: c.fg, borderRadius: 999,
    padding: "2px 10px", fontSize: "0.75rem", fontWeight: 600, textTransform: "capitalize"
  };
}
