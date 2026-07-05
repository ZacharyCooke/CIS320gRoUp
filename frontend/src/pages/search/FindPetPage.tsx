import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { Spinner } from "../../components/Spinner";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";

interface ActiveSearch {
  id: string;
  pet_id: string;
  pet_name: string;
  pet_species: string;
  pet_photo_urls: string[];
}

const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐕",
  cat: "🐈",
  bird: "🐦"
};

export function FindPetPage() {
  const [searches, setSearches] = useState<ActiveSearch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadSearches() {
    setError(null);
    apiClient
      .get("/searches/mine")
      .then(({ data }) => setSearches(data.searches ?? []))
      .catch(() => setError("Could not load your active searches."));
  }

  useEffect(() => {
    loadSearches();
  }, []);

  if (error) {
    return (
      <section className="app-shell">
        <ErrorState message={error} onRetry={loadSearches} />
      </section>
    );
  }

  if (!searches) {
    return (
      <section className="app-shell">
        <Spinner label="Loading your active searches..." />
      </section>
    );
  }

  if (searches.length === 1) {
    return <Navigate to={`/searches/${searches[0].id}`} replace />;
  }

  return (
    <section className="app-shell" style={{ maxWidth: 720 }}>
      <div className="page-header-row">
        <div>
          <h1>🔍 Find a Pet</h1>
          <p className="page-sub">Jump into a live multi-source search for one of your lost pets.</p>
        </div>
      </div>

      {searches.length === 0 ? (
        <div className="section-card">
          <EmptyState
            icon="🐾"
            message="No active searches right now. Mark a pet lost from your dashboard to start one."
            actionLabel="Go to Dashboard"
            actionTo="/dashboard"
          />
        </div>
      ) : (
        <div className="pet-grid">
          {searches.map((search) => (
            <Link
              to={`/searches/${search.id}`}
              key={search.id}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="pet-card">
                <div className="pet-card-photo">
                  {search.pet_photo_urls?.[0] ? (
                    <img src={search.pet_photo_urls[0]} alt={search.pet_name} />
                  ) : (
                    SPECIES_EMOJI[search.pet_species] ?? "🐾"
                  )}
                  <span className="badge badge-lost pet-card-badge-overlay">⚠ Lost</span>
                </div>
                <div className="pet-card-body">
                  <div className="pet-card-name">{search.pet_name}</div>
                  <div className="pet-card-desc">View live search &amp; map →</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
