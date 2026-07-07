import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { NotificationBell } from "../../components/NotificationBell";
import { AdBanner, SidebarAd } from "../../components/AdBanner";
import { Spinner } from "../../components/Spinner";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";
import { useCurrentUser } from "../../hooks/useCurrentUser";

const QRScannerModal = lazy(async () => {
  const module = await import("../../components/QRScannerModal");
  return { default: module.QRScannerModal };
});

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  color: string;
  size: string;
  status: string;
  microchip_number: string | null;
  photo_urls: string[];
}

const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐕",
  cat: "🐈",
  bird: "🐦"
};

export function DashboardPage() {
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const { user } = useCurrentUser();

  function loadPets() {
    setLoading(true);
    setError(null);
    apiClient
      .get("/pets")
      .then(({ data }) => setPets(data.pets))
      .catch((err: { response?: { data?: { error?: string } } }) => {
        setError(err.response?.data?.error ?? "Failed to load pets");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPets();
  }, []);

  return (
    <section className="app-shell">
      {showScanner && (
        <Suspense fallback={null}>
          <QRScannerModal onClose={() => setShowScanner(false)} />
        </Suspense>
      )}

      <div className="page-header-row">
        <div>
          <h1>My Pets</h1>
          <p className="page-sub">Manage your registered pets and tracking devices.</p>
        </div>
        <div className="header-actions">
          {user && <NotificationBell userId={user.id} />}
          <button type="button" onClick={() => setShowScanner(true)}>📷 Scan QR</button>
          <button type="button" className="btn-outline" onClick={() => navigate("/found-report")}>
            Report Found Pet
          </button>
          <button type="button" onClick={() => navigate("/pets/new")}>+ Add Pet</button>
        </div>
      </div>

      <AdBanner isPremium={user?.is_premium ?? false} adIndex={0} />

      {loading && <Spinner label="Loading your pets…" />}
      {error && <ErrorState message={error} onRetry={loadPets} />}

      {!loading && !error && pets.length === 0 && (
        <EmptyState
          icon="🐾"
          message="You haven't registered any pets yet. Add your first pet to get started."
          actionLabel="+ Add Pet"
          actionTo="/pets/new"
        />
      )}

      {!loading && !error && pets.length > 0 && (
        <div className="pet-grid">
          {pets.map((pet) => (
            <div
              key={pet.id}
              className="pet-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/pets/${pet.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/pets/${pet.id}`);
                }
              }}
            >
              <div className="pet-card-photo">
                {pet.photo_urls?.[0] ? (
                  <img src={pet.photo_urls[0]} alt={pet.name} />
                ) : (
                  SPECIES_EMOJI[pet.species] ?? "🐾"
                )}
                <span
                  className={`badge pet-card-badge-overlay ${pet.status === "lost" ? "badge-lost" : "badge-safe"}`}
                >
                  {pet.status === "lost" ? "⚠ Lost" : "✓ Safe"}
                </span>
              </div>
              <div className="pet-card-body">
                <div className="pet-card-name">{pet.name}</div>
                <div className="pet-card-desc">
                  {[pet.breed, pet.color, pet.size].filter(Boolean).join(" · ")}
                </div>
                <div className="pet-card-tags">
                  {pet.microchip_number && <span className="tag">Chip: {pet.microchip_number}</span>}
                </div>
              </div>
            </div>
          ))}

          <div
            className="add-pet-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate("/pets/new")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/pets/new");
              }
            }}
          >
            <div className="plus">＋</div>
            <p>Register Another Pet</p>
          </div>

          <SidebarAd isPremium={user?.is_premium ?? false} adIndex={1} />
        </div>
      )}
    </section>
  );
}
