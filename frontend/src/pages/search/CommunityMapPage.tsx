import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/api-client";

interface FoundReport {
  id: string;
  description: string;
  species: string | null;
  breed: string | null;
  color: string | null;
  photo_urls: string[];
  lat: number;
  lng: number;
  location_name: string | null;
  found_at: string;
  status: string;
}

interface MissingPet {
  search_id: string;
  pet_id: string;
  owner_id: string;
  started_at: string;
  name: string;
  species: string;
  breed: string | null;
  color: string;
  photo_urls: string[];
  temperament: string;
  approach_notes: string | null;
  qr_code_token: string;
  distance_miles: number;
}

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

export function CommunityMapPage() {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [missingPets, setMissingPets] = useState<MissingPet[]>([]);
  const [reports, setReports] = useState<FoundReport[]>([]);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markers = useRef<any[]>([]);

  function useMyLocation() {
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setError("Could not get your location. Try entering coordinates manually, or check your browser's location permission.");
        setLocating(false);
      }
    );
  }

  useEffect(() => {
    if (lat == null || lng == null) return;
    setLoading(true);
    setError(null);
    Promise.all([
      apiClient.get("/searches/nearby", { params: { lat, lng, radius_miles: radiusMiles } })
        .then(({ data }) => setMissingPets(data.missing_pets ?? [])),
      apiClient.get("/found-reports", { params: { lat, lng, radius: radiusMiles } })
        .then(({ data }) => setReports(data.reports ?? []))
    ])
      .catch(() => setError("Could not load nearby reports."))
      .finally(() => setLoading(false));
  }, [lat, lng, radiusMiles]);

  // Lazy-load Leaflet, matching the pattern used on the search results map.
  useEffect(() => {
    if (!mapRef.current || lat == null || lng == null) return;
    import("leaflet").then((L) => {
      if (!leafletMap.current) {
        leafletMap.current = L.map(mapRef.current!).setView([lat, lng], 11);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors"
        }).addTo(leafletMap.current);
      } else {
        leafletMap.current.setView([lat, lng], 11);
      }

      markers.current.forEach((m) => m.remove());
      markers.current = [];

      const you = L.marker([lat, lng], {
        icon: L.divIcon({ className: "", html: "📍", iconSize: [24, 24] })
      }).bindPopup("Your location").addTo(leafletMap.current);
      markers.current.push(you);

      // Missing-pet search centers are intentionally not returned by the API (only
      // distance) to avoid exposing a lost pet's exact last-known location in a
      // bulk-listable endpoint — they're represented in the list below instead.
      reports.forEach((r) => {
        const m = L.marker([r.lat, r.lng], {
          icon: L.divIcon({ className: "", html: "🟢", iconSize: [24, 24] })
        })
          .bindPopup(`<b>Found:</b> ${r.species ?? "Unknown animal"}<br/>${r.description.slice(0, 100)}`)
          .addTo(leafletMap.current);
        markers.current.push(m);
      });
    });
  }, [lat, lng, reports]);

  return (
    <div style={{ padding: "1.5rem", maxWidth: 900, margin: "0 auto" }}>
      <Link to="/dashboard">← Dashboard</Link>
      <h1>Community Map</h1>
      <p style={{ color: "#6b7280" }}>
        See pets reported missing and found-pet reports near a location of your choosing.
      </p>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
        <button type="button" onClick={useMyLocation} disabled={locating}>
          {locating ? "Getting location…" : "Use my location"}
        </button>
        <label>
          Radius:{" "}
          <select value={radiusMiles} onChange={(e) => setRadiusMiles(Number(e.target.value))}>
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>{r} mi</option>
            ))}
          </select>
        </label>
      </div>

      {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}

      {lat == null || lng == null ? (
        <p style={{ color: "#6b7280" }}>
          Click "Use my location" above to see missing and found pets near you.
        </p>
      ) : (
        <>
          <div ref={mapRef} style={{ height: 360, width: "100%", marginBottom: "1rem", borderRadius: 8 }} />

          {loading && <p>Loading nearby pets…</p>}

          <h2 style={{ fontSize: "1.1rem" }}>Missing Pets Nearby {!loading && `(${missingPets.length})`}</h2>
          {!loading && missingPets.length === 0 && (
            <p style={{ color: "#6b7280" }}>No pets currently reported missing within {radiusMiles} miles.</p>
          )}
          <ul style={{ listStyle: "none", padding: 0 }}>
            {missingPets.map((p) => (
              <li key={p.search_id} style={{
                display: "flex", gap: "0.75rem", padding: "0.75rem",
                border: "1px solid #fca5a5", background: "#fef2f2", borderRadius: 6, marginBottom: "0.5rem"
              }}>
                {p.photo_urls[0] && (
                  <img src={p.photo_urls[0]} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 4 }} />
                )}
                <div style={{ flex: 1 }}>
                  <strong>{p.name}</strong> — {[p.species, p.breed, p.color].filter(Boolean).join(" · ")}
                  {p.approach_notes && <p style={{ margin: "0.25rem 0" }}>{p.approach_notes}</p>}
                  <div style={{ fontSize: "0.8em", color: "#6b7280" }}>
                    {p.distance_miles.toFixed(1)} mi away · missing since {new Date(p.started_at).toLocaleDateString()}
                  </div>
                  <Link to={`/p/${p.qr_code_token}`} target="_blank" rel="noopener noreferrer">
                    View profile &amp; contact owner →
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          <h2 style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>Found-Pet Reports Nearby {!loading && `(${reports.length})`}</h2>
          {!loading && reports.length === 0 && (
            <p style={{ color: "#6b7280" }}>No found-pet reports within {radiusMiles} miles right now.</p>
          )}
          <ul style={{ listStyle: "none", padding: 0 }}>
            {reports.map((r) => (
              <li key={r.id} style={{
                display: "flex", gap: "0.75rem", padding: "0.75rem",
                border: "1px solid #e5e7eb", borderRadius: 6, marginBottom: "0.5rem"
              }}>
                {r.photo_urls[0] && (
                  <img src={r.photo_urls[0]} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 4 }} />
                )}
                <div>
                  <strong>{[r.species, r.breed, r.color].filter(Boolean).join(" · ") || "Unknown animal"}</strong>
                  <p style={{ margin: "0.25rem 0" }}>{r.description}</p>
                  <div style={{ fontSize: "0.8em", color: "#6b7280" }}>
                    {r.location_name ?? `${r.lat.toFixed(3)}, ${r.lng.toFixed(3)}`} · {new Date(r.found_at).toLocaleDateString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
