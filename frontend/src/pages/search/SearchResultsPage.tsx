import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { connectToSearch, disconnectSearch } from "../../services/websocket.client";
import { Spinner } from "../../components/Spinner";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";
import "leaflet/dist/leaflet.css";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIcon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

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
  pet_name: string | null;
  pet_species: string | null;
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

const SOURCE_META: Record<string, { label: string; icon: string; color: string }> = {
  petfinder_api: { label: "PetFinder", icon: "🐾", color: "#7c3aed" },
  tracking_device: { label: "Tracking Device", icon: "📡", color: "#0284c7" },
  found_report: { label: "Community Report", icon: "🤝", color: "#059669" }
};

const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐶",
  cat: "🐱",
  bird: "🐦",
  other: "🐾"
};

export function SearchResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState<Search | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [vetBolos, setVetBolos] = useState<VetBolo[]>([]);
  const [complete, setComplete] = useState(false);
  const [radius, setRadius] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [vetBolosError, setVetBolosError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const markersById = useRef<Map<string, any>>(new Map());

  function recenterOn(pointLat: number, pointLng: number, markerKey?: string) {
    if (!leafletMap.current) return;
    leafletMap.current.setView([pointLat, pointLng], 15);
    if (markerKey) markersById.current.get(markerKey)?.openPopup();
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function loadResults() {
    if (!id) return;
    setError(null);
    apiClient.get(`/searches/${id}/results`).then(({ data }) => {
      setSearch(data.search);
      setRadius(data.search.radius_miles);
      setResults(data.results ?? []);
    }).catch(() => setError("Search not found."));
  }

  function loadVetBolos() {
    if (!id) return;
    setVetBolosError(null);
    apiClient.get(`/searches/${id}/vet-bolos`).then(({ data }) => {
      setVetBolos(data.vet_bolos ?? []);
    }).catch(() => setVetBolosError("Could not load vet clinics notified for this search."));
  }

  useEffect(() => {
    if (!id) return;

    loadResults();
    loadVetBolos();

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

  // Lazy-load Leaflet to keep it out of the main bundle
  useEffect(() => {
    if (!mapRef.current || !search) return;
    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;
      if (leafletMap.current) return;

      // Vite/webpack break Leaflet's default marker icon (it resolves image
      // paths relative to leaflet.js at runtime, which doesn't survive
      // bundling) — repoint at the bundled asset URLs instead.
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: markerIconUrl,
        iconRetinaUrl: markerIcon2xUrl,
        shadowUrl: markerShadowUrl
      });

      leafletMap.current = L.map(mapRef.current!).setView(
        [search.center_lat, search.center_lng], 11
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
      }).addTo(leafletMap.current);
      L.circle([search.center_lat, search.center_lng], {
        radius: search.radius_miles * 1609.34, color: "#0f766e", fillOpacity: 0.1
      }).addTo(leafletMap.current);
      setMapReady(true);
    });

    return () => {
      leafletMap.current?.remove();
      leafletMap.current = null;
      setMapReady(false);
    };
  }, [search]);

  useEffect(() => {
    if (!mapReady || !leafletMap.current) return;
    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      markersById.current.clear();
      if (search) {
        const emoji = SPECIES_EMOJI[search.pet_species ?? "other"] ?? SPECIES_EMOJI.other;
        const missing = L.marker([search.center_lat, search.center_lng], {
          icon: L.divIcon({
            className: "map-marker-icon",
            html: markerBadge(emoji, `Lost ${search.pet_species ?? "pet"}`, "missing"),
            iconSize: [120, 42],
            iconAnchor: [60, 42],
            popupAnchor: [0, -42]
          })
        })
          .bindPopup(`<b>Lost:</b> ${escapeHtml(search.pet_name ?? "Missing pet")}<br/>Last reported location`)
          .addTo(leafletMap.current);
        labelMarker(missing, `Lost ${search.pet_species ?? "pet"}: ${search.pet_name ?? "missing pet"}, last reported location`);
        markers.current.push(missing);
        markersById.current.set("missing-pet", missing);
      }
      results.forEach((r) => {
        if (r.lat != null && r.lng != null) {
          const meta = SOURCE_META[r.source];
          const m = L.marker([r.lat, r.lng])
            .bindPopup(`<b>${r.name ?? "Unknown"}</b><br/>${meta?.label ?? r.source}`)
            .addTo(leafletMap.current);
          labelMarker(m, `${r.name ?? "Unknown result"} — ${meta?.label ?? r.source}`);
          markers.current.push(m);
          markersById.current.set(`result-${r.id}`, m);
        }
      });
    });
  }, [mapReady, search, results]);

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

  if (error) {
    return (
      <section className="app-shell">
        <ErrorState message={error} onRetry={loadResults} />
      </section>
    );
  }
  if (!search) {
    return (
      <section className="app-shell">
        <Spinner label="Loading search results…" />
      </section>
    );
  }

  return (
    <div className="app-shell">
      <Link to="/dashboard" style={{ display: "inline-block", marginBottom: 20 }}>← Dashboard</Link>

      <div className="page-header-row">
        <div>
          <h1>🔍 Search Results</h1>
          <p className="page-sub">
            {complete ? "Search complete." : "Searching all linked sources — results stream in live."}
          </p>
        </div>
        <button type="button" className="btn-danger" onClick={closeSearch}>
          ✓ Mark Recovered
        </button>
      </div>

      {!complete && (
        <div style={{
          background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10,
          padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10,
          fontSize: "0.85rem", color: "#92400e"
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%", background: "#f59e0b",
            display: "inline-block", animation: "pulse 1s infinite"
          }} />
          Searching PetFinder, tracking devices, and community reports…
        </div>
      )}

      <div className="section-card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
        <div ref={mapRef} className="map-container" />
      </div>

      <div className="section-card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ flex: 1, minWidth: 220 }}>
            Radius: {radius} mi
            <input type="range" min={1} max={500} value={radius}
              onChange={(e) => setRadius(Number(e.target.value))} />
          </label>
          <button type="button" className="btn-outline" onClick={adjustRadius}>Update radius</button>
        </div>
      </div>

      <div className="section-card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div className="section-title" style={{ fontSize: "0.95rem", color: "#1e293b", textTransform: "none", letterSpacing: 0, marginBottom: 0 }}>
            Search Results
          </div>
          <span className="badge badge-lost">{results.length} match{results.length !== 1 ? "es" : ""}</span>
        </div>

        {results.length === 0 && <EmptyState compact message="No results yet — check back shortly." />}

        {results.map((r) => {
          const meta = SOURCE_META[r.source] ?? { label: r.source, icon: "❔", color: "#6b7280" };
          const hasLocation = r.lat != null && r.lng != null;
          return (
            <div
              className="list-row"
              key={r.id}
              style={{ alignItems: "flex-start", cursor: hasLocation ? "pointer" : undefined }}
              role={hasLocation ? "button" : undefined}
              tabIndex={hasLocation ? 0 : undefined}
              onClick={hasLocation ? () => recenterOn(r.lat!, r.lng!, `result-${r.id}`) : undefined}
              onKeyDown={hasLocation ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  recenterOn(r.lat!, r.lng!, `result-${r.id}`);
                }
              } : undefined}
            >
              <div className="list-row-left" style={{ alignItems: "flex-start" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 10, flexShrink: 0,
                  background: `${meta.color}1a`, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "1.5rem", overflow: "hidden"
                }}>
                  {r.photo_url ? (
                    <img src={r.photo_url} alt={r.name ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : meta.icon}
                </div>
                <div>
                  <div className="notif-type-label" style={{ color: meta.color }}>{meta.label}</div>
                  <div className="list-row-name">{r.name ?? "Unknown"}</div>
                  <div className="list-row-sub">
                    {[r.species, r.breed, r.color].filter(Boolean).join(" · ")}
                  </div>
                  {r.description && (
                    <p style={{ fontSize: "0.85rem", color: "#475569", margin: "4px 0 0" }}>
                      {r.description.slice(0, 140)}
                    </p>
                  )}
                  {r.contact_info && (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                      {r.contact_info.split(" | ").map((contact) => (
                        <a
                          key={contact}
                          href={contact.includes("@") ? `mailto:${contact}` : `tel:${contact}`}
                          style={{ fontSize: "0.8rem", fontWeight: 600 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {contact.includes("@") ? "✉️" : "📞"} {contact}
                        </a>
                      ))}
                    </div>
                  )}
                  {r.source_url && (
                    <a
                      href={r.source_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: "0.8rem" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      View on {meta.label} ↗
                    </a>
                  )}
                </div>
              </div>
              {r.distance_miles != null && (
                <span className="status-pill" style={{ whiteSpace: "nowrap" }}>
                  {r.distance_miles.toFixed(1)} mi
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="section-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div className="section-title" style={{ fontSize: "0.95rem", color: "#1e293b", textTransform: "none", letterSpacing: 0, marginBottom: 0 }}>
            🏥 Vet Clinics Notified
          </div>
          <span className="tag tag-teal">{vetBolos.length}</span>
        </div>
        {vetBolosError && <ErrorState message={vetBolosError} onRetry={loadVetBolos} />}
        {!vetBolosError && vetBolos.length === 0 ? (
          <EmptyState compact message="No nearby vet clinics notified yet." />
        ) : (
          vetBolos.map((v) => (
            <div className="list-row" key={v.id}>
              <div className="list-row-left">
                <span className="list-row-icon">🏥</span>
                <div>
                  <div className="list-row-name">{v.clinic_name}</div>
                  {v.clinic_address && <div className="list-row-sub">{v.clinic_address}</div>}
                </div>
              </div>
              <span className="status-pill" style={{ color: statusColor(v.email_status) }}>
                ● {v.email_status}
                {v.distance_miles != null && ` · ${v.distance_miles.toFixed(1)} mi`}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function statusColor(status: string): string {
  if (status === "sent") return "#16a34a";
  if (status === "bounced") return "#ea580c";
  return "#6b7280";
}

function markerBadge(emoji: string, label: string, tone: "missing" | "tracker" | "sighting"): string {
  return `<span class="map-marker-badge map-marker-${tone}"><span class="map-marker-emoji">${emoji}</span>${escapeHtml(label)}</span>`;
}

// See CommunityMapPage.tsx's identical helper: neither a custom divIcon nor
// Leaflet's default icon marker gets an accessible name/role on its own,
// even though the marker itself is already keyboard-focusable by default.
function labelMarker(marker: any, label: string): any {
  const el = marker.getElement();
  if (el) {
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", label);
  }
  return marker;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char] ?? char));
}
