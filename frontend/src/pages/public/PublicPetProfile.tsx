import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

interface PublicProfile {
  name: string;
  species: string;
  breed: string | null;
  color: string;
  size: string;
  photo_urls: string[];
  status: string;
  temperament: string;
  approach_notes: string | null;
  medical_conditions: string[];
  medical_emergency_notes: string | null;
  owner: { name: string | null; email: string; phone: string | null };
}

const TEMPERAMENT_LABELS: Record<string, { label: string; color: string }> = {
  friendly: { label: "Friendly — safe to approach", color: "#16a34a" },
  cautious: { label: "Cautious — approach carefully", color: "#d97706" },
  report_only: { label: "Report Only — Do Not Approach", color: "#dc2626" }
};

export function PublicPetProfile() {
  const { token } = useParams<{ token: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/p/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("not_found");
        return res.json();
      })
      .then((data) => setProfile(data.profile))
      .catch(() => setError("This pet profile could not be found. The code may be inactive."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;
  if (error) return <p role="alert" style={{ padding: 24, color: "#dc2626" }}>{error}</p>;
  if (!profile) return null;

  const temperament = TEMPERAMENT_LABELS[profile.temperament] ?? {
    label: profile.temperament,
    color: "#6b7280"
  };

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 24 }}>
      {profile.status === "lost" && (
        <div
          style={{
            background: "#dc2626",
            color: "white",
            padding: "10px 16px",
            borderRadius: 8,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 16
          }}
        >
          🐾 THIS PET IS REPORTED LOST — please contact the owner below
        </div>
      )}

      {profile.photo_urls.length > 0 && (
        <img
          src={profile.photo_urls[0]}
          alt={profile.name}
          style={{ width: "100%", borderRadius: 12, marginBottom: 16, objectFit: "cover" }}
        />
      )}

      <h1 style={{ marginBottom: 4 }}>{profile.name}</h1>
      <p style={{ color: "#4b5563", marginTop: 0 }}>
        {profile.species}
        {profile.breed ? ` · ${profile.breed}` : ""} · {profile.color} · {profile.size}
      </p>

      <div
        style={{
          display: "inline-block",
          padding: "4px 14px",
          borderRadius: 999,
          background: temperament.color,
          color: "white",
          fontWeight: 600,
          fontSize: "0.9em",
          marginBottom: 12
        }}
      >
        {temperament.label}
      </div>
      {profile.approach_notes && (
        <p style={{ fontStyle: "italic", color: "#374151" }}>{profile.approach_notes}</p>
      )}

      {profile.medical_conditions.length > 0 && (
        <section style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: "1.1em" }}>Medical Conditions</h2>
          <ul>
            {profile.medical_conditions.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      )}

      {profile.medical_emergency_notes && (
        <p
          style={{
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            padding: 10,
            borderRadius: 6
          }}
        >
          <strong>⚠️ Emergency note:</strong> {profile.medical_emergency_notes}
        </p>
      )}

      <section
        style={{
          marginTop: 20,
          background: "#f0fdf4",
          border: "1px solid #86efac",
          padding: 14,
          borderRadius: 10
        }}
      >
        <h2 style={{ fontSize: "1.1em", marginTop: 0 }}>Contact the Owner</h2>
        {profile.owner.name && <p style={{ margin: "4px 0" }}>{profile.owner.name}</p>}
        <p style={{ margin: "4px 0" }}>
          ✉ <a href={`mailto:${profile.owner.email}`}>{profile.owner.email}</a>
        </p>
        {profile.owner.phone && (
          <p style={{ margin: "4px 0" }}>
            📞 <a href={`tel:${profile.owner.phone.replace(/\s/g, "")}`}>{profile.owner.phone}</a>
          </p>
        )}
      </section>
    </main>
  );
}
