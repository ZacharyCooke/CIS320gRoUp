import { Link } from "react-router-dom";
import { MarkLostModal } from "../search/MarkLostModal";
import { PetProfileHeader } from "./profile/PetProfileHeader";
import { PetProfileSections } from "./profile/PetProfileSections";
import { usePetProfile } from "./profile/usePetProfile";
import { Spinner } from "../../components/Spinner";
import { ErrorState } from "../../components/ErrorState";

export function PetProfilePage() {
  const profile = usePetProfile();

  if (profile.loadError) {
    return (
      <section className="app-shell">
        <ErrorState message={profile.loadError} />
      </section>
    );
  }

  if (!profile.pet) {
    return (
      <section className="app-shell">
        <Spinner label="Loading pet profile…" />
      </section>
    );
  }

  return (
    <section className="app-shell" style={{ maxWidth: 900 }}>
      {profile.showMarkLost && (
        <MarkLostModal
          petId={profile.pet.id}
          petName={profile.pet.name}
          onClose={() => profile.setShowMarkLost(false)}
        />
      )}

      <Link to="/dashboard" style={{ display: "inline-block", marginBottom: 20 }}>
        Back to Dashboard
      </Link>

      <PetProfileHeader
        pet={profile.pet}
        activeSearchId={profile.activeSearchId}
        onMarkLost={() => profile.setShowMarkLost(true)}
      />

      {profile.actionMsg && <p style={{ color: "green" }}>{profile.actionMsg}</p>}
      {profile.actionError && <ErrorState message={profile.actionError} />}
      {profile.sectionsError && (
        <ErrorState message={profile.sectionsError} onRetry={profile.retrySections} />
      )}

      <PetProfileSections profile={profile} />
    </section>
  );
}
