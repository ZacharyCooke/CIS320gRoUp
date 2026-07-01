import { findPetById } from "../models/pet.model.js";
import {
  createTrackingDevice,
  deleteTrackingDeviceById,
  findTrackingDevicesByPetId,
  type CreateTrackingDeviceInput,
  type TrackingDevice
} from "../models/tracking-device.model.js";

async function assertPetOwner(petId: string, ownerId: string): Promise<void> {
  const pet = await findPetById(petId);
  if (!pet || pet.owner_id !== ownerId) {
    throw new Error("pet not found");
  }
}

export async function link(
  ownerId: string,
  input: CreateTrackingDeviceInput
): Promise<TrackingDevice> {
  await assertPetOwner(input.pet_id, ownerId);
  return createTrackingDevice(input);
}

export async function unlink(
  ownerId: string,
  petId: string,
  trackingDeviceId: string
): Promise<boolean> {
  await assertPetOwner(petId, ownerId);
  return deleteTrackingDeviceById(trackingDeviceId, petId);
}

export async function listForPet(ownerId: string, petId: string): Promise<TrackingDevice[]> {
  await assertPetOwner(petId, ownerId);
  return findTrackingDevicesByPetId(petId);
}
