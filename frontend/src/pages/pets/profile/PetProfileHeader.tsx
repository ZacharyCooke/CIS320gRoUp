import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../../../services/api-client";
import { ErrorState } from "../../../components/ErrorState";
import { SPECIES_EMOJI } from "./constants";
import type { Pet } from "./types";

interface Props {
  pet: Pet;
  activeSearchId: string | null;
  onMarkLost: () => void;
}

export function PetProfileHeader({ pet, activeSearchId, onMarkLost }: Props) {
  const navigate = useNavigate();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.delete(`/pets/${pet.id}`);
      navigate("/dashboard");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      const code = e.response?.data?.error;
      if (code === "pet_has_active_search") {
        setDeleteError("This pet has an active search — mark it safe or close the search before deleting.");
      } else if (code === "pet_has_active_reward") {
        setDeleteError("This pet has an unresolved reward — cancel or resolve it before deleting.");
      } else {
        setDeleteError(e.response?.data?.message ?? "Failed to delete pet.");
      }
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="profile-header">
      <div className="profile-photo">
        {pet.photo_urls?.[0] ? (
          <img src={pet.photo_urls[0]} alt={pet.name} />
        ) : (
          SPECIES_EMOJI[pet.species] ?? "🐾"
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

          <Link to={`/pets/${pet.id}/edit`}>
            <button type="button" className="btn-outline">Edit Profile</button>
          </Link>

          {confirmingDelete ? (
            <>
              <span style={{ fontSize: "0.85rem", color: "#5f6f89" }}>Delete {pet.name}&apos;s profile?</span>
              <button type="button" className="btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button type="button" className="btn-outline" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="btn-outline" onClick={() => setConfirmingDelete(true)}>
              Delete Profile
            </button>
          )}
        </div>

        {deleteError && (
          <div style={{ marginTop: 12 }}>
            <ErrorState message={deleteError} />
          </div>
        )}
      </div>
    </div>
  );
}
