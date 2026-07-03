import { findPetWithOwnerByQrToken } from "../models/pet.model.js";

export interface PublicPetProfile {
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
  owner: {
    name: string | null;
    email: string;
    phone: string | null;
  };
}

/**
 * Resolve a QR token to a sanitized public profile. Only conditions marked
 * share_publicly are exposed, and emergency notes appear only when
 * share_emergency_notes is enabled (FR-004). Returns null for unknown tokens.
 */
export async function getPublicProfile(token: string): Promise<PublicPetProfile | null> {
  const pet = await findPetWithOwnerByQrToken(token);
  if (!pet) return null;

  const ownerName = [pet.owner_first_name, pet.owner_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    color: pet.color,
    size: pet.size,
    photo_urls: pet.photo_urls,
    status: pet.status,
    temperament: pet.temperament,
    approach_notes: pet.approach_notes,
    medical_conditions: pet.medical_conditions
      .filter((c) => c.share_publicly)
      .map((c) => c.condition),
    medical_emergency_notes: pet.share_emergency_notes ? pet.medical_emergency_notes : null,
    owner: {
      name: ownerName.length > 0 ? ownerName : null,
      email: pet.owner_email,
      phone: pet.owner_phone
    }
  };
}
