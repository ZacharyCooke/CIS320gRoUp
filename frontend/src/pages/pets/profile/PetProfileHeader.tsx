import { Link } from "react-router-dom";
import { SPECIES_LABELS } from "./constants";
import type { Pet } from "./types";

interface Props {
  pet: Pet;
  activeSearchId: string | null;
  onMarkLost: () => void;
}

export function PetProfileHeader({ pet, activeSearchId, onMarkLost }: Props) {
  return (
    <div className="profile-header">
      <div className="profile-photo">
        {pet.photo_urls?.[0] ? (
          <img src={pet.photo_urls[0]} alt={pet.name} />
        ) : (
          SPECIES_LABELS[pet.species] ?? "Pet"
        )}
      </div>

      <div className="profile-info">
        <div className="profile-name-row">
          <h1>{pet.name}</h1>
          <span className={`badge ${pet.status === "lost" ? "badge-lost" : "badge-safe"}`}>
            {pet.status === "lost" ? "Lost" : "Safe"}
          </span>
        </div>

        <div className="meta-row">
          <span><strong>Species:</strong> {pet.species}</span>
          <span><strong>Color:</strong> {pet.color}</span>
          <span><strong>Size:</strong> {pet.size}</span>
        </div>

        <div className="action-row">
          {pet.status !== "lost" ? (
            <button type="button" className="btn-danger" onClick={onMarkLost}>
              Mark as Lost
            </button>
          ) : (
            activeSearchId && (
              <>
                <Link to={`/searches/${activeSearchId}`}>
                  <button type="button">View Search &amp; Map</button>
                </Link>
                <Link to={`/pets/${pet.id}/reward`}>
                  <button type="button" className="btn-outline">Set Reward</button>
                </Link>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}
