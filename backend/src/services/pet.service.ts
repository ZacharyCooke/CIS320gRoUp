import {
  appendPetPhotoUrl,
  createPet,
  deletePetById,
  findPetById,
  findPetsByOwnerId,
  rotatePetQrToken,
  updatePetById,
  updatePetMedical,
  type CreatePetInput,
  type MedicalCondition,
  type Pet
} from "../models/pet.model.js";
import { findUserById } from "../models/user.model.js";

// Free accounts are capped at this many pet profiles; Premium subscribers
// (User.is_premium) are unlimited (spec: User Story 7, acceptance scenario 4).
const FREE_TIER_PET_LIMIT = 3;

export class PetLimitReachedError extends Error {
  constructor() {
    super(`Free accounts are limited to ${FREE_TIER_PET_LIMIT} pet profiles`);
    this.name = "PetLimitReachedError";
  }
}

export async function create(ownerId: string, input: Omit<CreatePetInput, "owner_id">): Promise<Pet> {
  const owner = await findUserById(ownerId);
  if (!owner?.is_premium) {
    const existing = await findPetsByOwnerId(ownerId);
    if (existing.length >= FREE_TIER_PET_LIMIT) {
      throw new PetLimitReachedError();
    }
  }
  return createPet({ ...input, owner_id: ownerId });
}

export async function read(ownerId: string, petId: string): Promise<Pet | null> {
  const pet = await findPetById(petId);
  return pet?.owner_id === ownerId ? pet : null;
}

export async function list(ownerId: string): Promise<Pet[]> {
  return findPetsByOwnerId(ownerId);
}

export async function update(
  ownerId: string,
  petId: string,
  input: Partial<Omit<CreatePetInput, "owner_id">>
): Promise<Pet | null> {
  return updatePetById(petId, ownerId, input);
}

export async function remove(ownerId: string, petId: string): Promise<boolean> {
  return deletePetById(petId, ownerId);
}

export async function addPhoto(ownerId: string, petId: string, photoUrl: string): Promise<Pet | null> {
  return appendPetPhotoUrl(petId, ownerId, photoUrl);
}

export async function rotateQr(ownerId: string, petId: string): Promise<Pet | null> {
  return rotatePetQrToken(petId, ownerId);
}

export async function updateMedical(
  ownerId: string,
  petId: string,
  data: {
    medical_conditions: MedicalCondition[];
    medical_emergency_notes?: string | null;
    share_emergency_notes?: boolean;
  }
): Promise<Pet | null> {
  return updatePetMedical(
    petId,
    ownerId,
    data.medical_conditions,
    data.medical_emergency_notes ?? null,
    data.share_emergency_notes ?? true
  );
}
