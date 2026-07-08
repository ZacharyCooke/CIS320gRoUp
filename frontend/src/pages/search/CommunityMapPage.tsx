import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import "leaflet/dist/leaflet.css";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIcon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

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
  // Fuzzed server-side to within 300ft of the true reported location, so the
  // pin plotted here is approximate by design — see search.routes.ts.
  last_seen_lat: number;
  last_seen_lng: number;
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
  tracking_devices: TrackingDevicePoint[];
}

interface TrackingDevicePoint {
  id: string;
  device_type: "airtag" | "amazon_tag";
  share_url: string;
  last_known_latitude: number;
  last_known_longitude: number;
  last_updated_at: string | null;
}

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];
const DEMO_LOCATION = { lat: 32.7157, lng: -117.1611 };
const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐕",
  cat: "🐈",
  bird: "🐦",
  other: "🐾"
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markerBadge(emoji: string, label: string, tone: "missing" | "tracker" | "sighting" | "you"): string {
  return `<span class="map-marker-badge map-marker-${tone}">
    <span class="map-marker-emoji">${emoji}</span>
    <span>${escapeHtml(label)}</span>
  </span>`;
}

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
  const markersById = useRef<Map<string, any>>(new Map());

  function recenterOn(pointLat: number, pointLng: number, markerKey?: string) {
    if (!leafletMap.current) return;
    leafletMap.current.setView([pointLat, pointLng], 15);
    if (markerKey) markersById.current.get(markerKey)?.openPopup();
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      setLat(DEMO_LOCATION.lat);
      setLng(DEMO_LOCATION.lng);
    }
  }, []);

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

  useEffect(() => {
    if (!mapRef.current || lat == null || lng == null) return;
    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;

      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: markerIconUrl,
        iconRetinaUrl: markerIcon2xUrl,
        shadowUrl: markerShadowUrl
      });

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
      markersById.current.clear();

      const you = L.marker([lat, lng], {
        icon: L.divIcon({
          className: "map-marker-icon",
          html: markerBadge("📍", "You", "you"),
          iconAnchor: [34, 20],
          iconSize: [68, 40]
        })
      }).bindPopup("Your location").addTo(leafletMap.current);
      markers.current.push(you);

      missingPets.forEach((p) => {
        const speciesEmoji = SPECIES_EMOJI[p.species] ?? SPECIES_EMOJI.other;
        const missing = L.marker([p.last_seen_lat, p.last_seen_lng], {
          icon: L.divIcon({
            className: "map-marker-icon",
            html: markerBadge(speciesEmoji, `Lost ${p.species}`, "missing"),
            iconAnchor: [58, 20],
            iconSize: [116, 40]
          })
        })
          .bindPopup(`<b>Missing:</b> ${escapeHtml(p.name)}<br/>Last reported location<br/>${p.distance_miles.toFixed(1)} mi away`)
          .addTo(leafletMap.current);
        markers.current.push(missing);
        markersById.current.set(`missing-${p.search_id}`, missing);

        p.tracking_devices?.forEach((device) => {
          const label = device.device_type === "airtag" ? "AirTag" : "Tracker";
          const tracker = L.marker([device.last_known_latitude, device.last_known_longitude], {
            icon: L.divIcon({
              className: "map-marker-icon",
              html: markerBadge("📡", label, "tracker"),
              iconAnchor: [48, 20],
              iconSize: [96, 40]
            })
          })
            .bindPopup(`<b>${label} ping:</b> ${escapeHtml(p.name)}<br/><a href="${escapeHtml(device.share_url)}" target="_blank" rel="noreferrer">Open tracking link</a>`)
            .addTo(leafletMap.current);
          markers.current.push(tracker);
        });
      });

      reports.forEach((r) => {
        const m = L.marker([r.lat, r.lng], {
          icon: L.divIcon({
            className: "map-marker-icon",
            html: markerBadge("👀", "Sighting", "sighting"),
            iconAnchor: [54, 20],
            iconSize: [108, 40]
          })
        })
          .bindPopup(`<b>Found:</b> ${escapeHtml(r.species ?? "Unknown animal")}<br/>${escapeHtml(r.description.slice(0, 100))}`)
          .addTo(leafletMap.current);
        markers.current.push(m);
        markersById.current.set(`report-${r.id}`, m);
      });

      window.setTimeout(() => leafletMap.current?.invalidateSize(), 0);
    });

    return () => {
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      leafletMap.current?.remove();
      leafletMap.current = null;
    };
  }, [lat, lng, missingPets, reports]);

  return (
    <div style={{ padding: "1.5rem", maxWidth: 900, margin: "0 auto" }}>
      <Link to="/dashboard">← Dashboard</Link>
      <h1>Community Map</h1>
      <p style={{ color: "#6b7280" }}>
        See pets reported missing and found-pet reports near a location of your choosing.
      </p>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
        <button type="button" onClick={useMyLocation} disabled={locating}>
          {locating ? "Getting location..." : "Use my location"}
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

          {loading && <p>Loading nearby pets...</p>}

          <h2 style={{ fontSize: "1.1rem" }}>Missing Pets Nearby {!loading && `(${missingPets.length})`}</h2>
          {!loading && missingPets.length === 0 && (
            <p style={{ color: "#6b7280" }}>No pets currently reported missing within {radiusMiles} miles.</p>
          )}
          <ul style={{ listStyle: "none", padding: 0 }}>
            {missingPets.map((p) => (
              <li
                key={p.search_id}
                role="button"
                tabIndex={0}
                onClick={() => recenterOn(p.last_seen_lat, p.last_seen_lng, `missing-${p.search_id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    recenterOn(p.last_seen_lat, p.last_seen_lng, `missing-${p.search_id}`);
                  }
                }}
                style={{
                  display: "flex", gap: "0.75rem", padding: "0.75rem", cursor: "pointer",
                  border: "1px solid #fca5a5", background: "#fef2f2", borderRadius: 6, marginBottom: "0.5rem"
                }}
              >
                {p.photo_urls[0] && (
                  <img src={p.photo_urls[0]} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 4 }} />
                )}
                <div style={{ flex: 1 }}>
                  <strong>{p.name}</strong> — {[p.species, p.breed, p.color].filter(Boolean).join(" · ")}
                  {p.approach_notes && <p style={{ margin: "0.25rem 0" }}>{p.approach_notes}</p>}
                  <div style={{ fontSize: "0.8em", color: "#6b7280" }}>
                    {p.distance_miles.toFixed(1)} mi away · missing since {new Date(p.started_at).toLocaleDateString()}
                  </div>
                  <Link
                    to={`/p/${p.qr_code_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
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
              <li
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => recenterOn(r.lat, r.lng, `report-${r.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    recenterOn(r.lat, r.lng, `report-${r.id}`);
                  }
                }}
                style={{
                  display: "flex", gap: "0.75rem", padding: "0.75rem", cursor: "pointer",
                  border: "1px solid #e5e7eb", borderRadius: 6, marginBottom: "0.5rem"
                }}
              >
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
