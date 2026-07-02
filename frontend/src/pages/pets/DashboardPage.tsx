import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { NotificationBell } from "../../components/NotificationBell";

interface Pet {
  id: string;
  name: string;
  species: string;
  status: string;
}

export function DashboardPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get("/pets")
      .then(({ data }) => setPets(data.pets))
      .catch((err: { response?: { data?: { error?: string } } }) => {
        setError(err.response?.data?.error ?? "Failed to load pets");
      })
      .finally(() => setLoading(false));

    // Decode user ID from stored JWT for notification bell
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
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, flex: 1 }}>My Pets</h1>
        {userId && <NotificationBell userId={userId} />}
        <Link to="/found-report">
          <button type="button" style={{ background: "#e0f2f1", color: "#0f766e" }}>
            Report Found Pet
          </button>
        </Link>
        <Link to="/pets/new">
          <button type="button">+ Add Pet</button>
        </Link>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}

      <div className="page-grid">
        {pets.map((pet) => (
          <article className="placeholder-page" key={pet.id}>
            <Link to={`/pets/${pet.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <h2>{pet.name}</h2>
              <p>{pet.species}</p>
              <strong style={{ color: pet.status === "lost" ? "#dc2626" : "#0f766e" }}>
                {pet.status}
              </strong>
            </Link>
          </article>
        ))}
        {!loading && !error && pets.length === 0 && (
          <p>No pets yet. <Link to="/pets/new">Add your first pet.</Link></p>
        )}
      </div>
    </section>
  );
}
