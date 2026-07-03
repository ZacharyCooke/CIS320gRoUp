import { findPetById } from "../models/pet.model.js";
import { deletePetVetByPetId, findPetVetByPetId, upsertPetVet, type PetVet } from "../models/pet-vet.model.js";

export async function upsert(
  petId: string,
  ownerId: string,
  input: { clinic_name: string; address?: string | null; phone?: string | null; email?: string | null }
): Promise<PetVet | null> {
  const pet = await findPetById(petId);
  if (!pet || pet.owner_id !== ownerId) return null;
  return upsertPetVet({ pet_id: petId, ...input });
}

export async function get(petId: string, ownerId: string): Promise<PetVet | null> {
  const pet = await findPetById(petId);
  if (!pet || pet.owner_id !== ownerId) return null;
  return findPetVetByPetId(petId);
}

export async function remove(petId: string, ownerId: string): Promise<boolean> {
  const pet = await findPetById(petId);
  if (!pet || pet.owner_id !== ownerId) return false;
  return deletePetVetByPetId(petId);
}
