import { Link } from "react-router-dom";
import { MarkLostModal } from "../search/MarkLostModal";
import { PetProfileHeader } from "./profile/PetProfileHeader";
import { PetProfileSections } from "./profile/PetProfileSections";
import { usePetProfile } from "./profile/usePetProfile";

export function PetProfilePage() {
  const profile = usePetProfile();

  if (profile.loadError) {
    return (
      <p role="alert" className="app-shell" style={{ color: "red" }}>
        {profile.loadError}
      </p>
    );
  }

  if (!profile.pet) return <p className="app-shell">Loading...</p>;

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
      {profile.actionError && (
        <p role="alert" style={{ color: "red" }}>
          {profile.actionError}
        </p>
      )}

      <PetProfileSections profile={profile} />
    </section>
  );
}
