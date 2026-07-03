import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { NotificationBell } from "../../components/NotificationBell";
import { QRScannerModal } from "../../components/QRScannerModal";

interface Pet {
  id: string;
  name: string;
  species: string;
  status: string;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    apiClient
      .get("/pets")
      .then(({ data }) => setPets(data.pets))
      .catch((err: { response?: { data?: { error?: string } } }) => {
        setError(err.response?.data?.error ?? "Failed to load pets");
      })
      .finally(() => setLoading(false));

    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserId(payload.id ?? null);
      } catch { /* ignore */ }
    }
  }, []);

  return (
    <section style={{ padding: "1.5rem" }}>
      {showScanner && <QRScannerModal onClose={() => setShowScanner(false)} />}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, flex: 1 }}>My Pets</h1>
        {userId && <NotificationBell userId={userId} />}
        <button type="button" onClick={() => setShowScanner(true)}>
          Scan QR
        </button>
        <button
          type="button"
          style={{ background: "#e0f2f1", color: "#0f766e" }}
          onClick={() => navigate("/found-report")}
        >
          Report Found Pet
        </button>
        <button type="button" onClick={() => navigate("/pets/new")}>
          + Add Pet
        </button>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}

      <div className="page-grid">
        {pets.map((pet) => (
          <article
            key={pet.id}
            className="placeholder-page"
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/pets/${pet.id}`)}
          >
            <h2 style={{ marginBottom: 8 }}>{pet.name}</h2>
            <p style={{ marginBottom: 8 }}>{pet.species}</p>
            <strong style={{ color: pet.status === "lost" ? "#dc2626" : "#0f766e" }}>
              {pet.status}
            </strong>
          </article>
        ))}
        {!loading && !error && pets.length === 0 && (
          <p>No pets yet. <Link to="/pets/new">Add your first pet.</Link></p>
        )}
      </div>
    </section>
  );
}
