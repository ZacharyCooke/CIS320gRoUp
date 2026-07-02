import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/api-client";

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

  useEffect(() => {
    apiClient
      .get("/pets")
      .then(({ data }) => setPets(data.pets))
      .catch((err: { response?: { data?: { error?: string } } }) => {
        setError(err.response?.data?.error ?? "Failed to load pets");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <h1>My Pets</h1>
      <Link to="/pets/new"><button type="button">+ Add Pet</button></Link>
      {loading && <p>Loading…</p>}
      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
      <div className="page-grid">
        {pets.map((pet) => (
          <article className="placeholder-page" key={pet.id}>
            <Link to={`/pets/${pet.id}`}>
              <h2>{pet.name}</h2>
              <p>{pet.species}</p>
              <strong>{pet.status}</strong>
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
