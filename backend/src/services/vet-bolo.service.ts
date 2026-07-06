import { findNearbyVetClinics } from "../integrations/google-places.client.js";
import { findPetVetByPetId } from "../models/pet-vet.model.js";
import { createVetBolo, type VetBolo } from "../models/vet-bolo.model.js";
import { sendEmail } from "../integrations/email.service.js";
import { findUserById } from "../models/user.model.js";
import { haversineDistanceMiles } from "./geo.service.js";
import { emitVetBoloSent } from "../integrations/websocket.server.js";
import { dispatchPetUpdate } from "./notification.service.js";
import type { Pet } from "../models/pet.model.js";

const BOLO_RADIUS_MILES = 2;

export async function dispatchVetBolos(
  searchId: string,
  pet: Pet,
  centerLat: number,
  centerLng: number
): Promise<VetBolo[]> {
  const [clinics, registeredVet, owner] = await Promise.all([
    findNearbyVetClinics(centerLat, centerLng, BOLO_RADIUS_MILES),
    findPetVetByPetId(pet.id),
    findUserById(pet.owner_id)
  ]);

  const ownerContact = owner
    ? [owner.first_name && owner.last_name ? `${owner.first_name} ${owner.last_name}` : null, owner.email, owner.phone]
        .filter(Boolean)
        .join(" · ")
    : "the owner via PetRecovery";

  const dispatched: VetBolo[] = [];
  const seenNames = new Set<string>();

  for (const clinic of clinics) {
    const distance = haversineDistanceMiles(centerLat, centerLng, clinic.lat, clinic.lng);
    seenNames.add(clinic.name.trim().toLowerCase());

    // Google Places never exposes a business email. If this discovered
    // clinic matches the pet's own registered vet, we have a real address
    // on file; otherwise there is no verified email to dispatch to.
    const isRegisteredVet = registeredVet?.clinic_name.trim().toLowerCase() === clinic.name.trim().toLowerCase();
    const email = isRegisteredVet ? registeredVet!.email : null;

    dispatched.push(
      await sendOne({
        searchId,
        pet,
        ownerContact,
        clinicName: clinic.name,
        clinicAddress: clinic.address,
        clinicPhone: clinic.phone,
        clinicEmail: email,
        lat: clinic.lat,
        lng: clinic.lng,
        distanceMiles: distance
      })
    );
  }

  // Always BOLO the pet's own registered vet, even if Places didn't surface it.
  if (registeredVet?.email && !seenNames.has(registeredVet.clinic_name.trim().toLowerCase())) {
    dispatched.push(
      await sendOne({
        searchId,
        pet,
        ownerContact,
        clinicName: registeredVet.clinic_name,
        clinicAddress: registeredVet.address,
        clinicPhone: registeredVet.phone,
        clinicEmail: registeredVet.email,
        lat: null,
        lng: null,
        distanceMiles: 0
      })
    );
  }

  if (dispatched.length > 0) {
    const sentCount = dispatched.filter((b) => b.email_status === "sent").length;
    await dispatchPetUpdate(
      pet.owner_id,
      `Vet BOLO emails sent for ${pet.name}`,
      `${sentCount} of ${dispatched.length} nearby vet clinic(s) were emailed about ${pet.name}.`,
      { search_id: searchId }
    );
  }

  return dispatched;
}

interface SendOneInput {
  searchId: string;
  pet: Pet;
  ownerContact: string;
  clinicName: string;
  clinicAddress: string | null;
  clinicPhone: string | null;
  clinicEmail: string | null;
  lat: number | null;
  lng: number | null;
  distanceMiles: number;
}

async function sendOne(input: SendOneInput): Promise<VetBolo> {
  let status: "sent" | "bounced" | "failed" = "failed";

  if (input.clinicEmail) {
    try {
      await sendEmail({
        to: input.clinicEmail,
        subject: `BOLO: Lost pet "${input.pet.name}" reported near your clinic`,
        text: renderBoloText(input),
        html: renderBoloHtml(input)
      });
      status = "sent";
    } catch (err) {
      console.error("[vet-bolo] send error:", err);
      status = "bounced";
    }
  }

  const bolo = await createVetBolo({
    search_id: input.searchId,
    pet_id: input.pet.id,
    clinic_name: input.clinicName,
    clinic_address: input.clinicAddress,
    clinic_email: input.clinicEmail,
    clinic_phone: input.clinicPhone,
    lat: input.lat,
    lng: input.lng,
    distance_miles: input.distanceMiles,
    email_status: status
  });

  emitVetBoloSent(input.searchId, { clinic_name: bolo.clinic_name, email_status: bolo.email_status });

  return bolo;
}

function renderBoloText(input: SendOneInput): string {
  const pet = input.pet;
  const sharedConditions = pet.medical_conditions.filter((c) => c.share_publicly).map((c) => c.condition);
  const lines = [
    `A ${pet.species} named ${pet.name} was reported lost ${input.distanceMiles.toFixed(1)} mi from your clinic.`,
    `Color: ${pet.color}`,
    pet.breed ? `Breed: ${pet.breed}` : null,
    pet.microchip_number ? `Microchip: ${pet.microchip_number}` : null,
    sharedConditions.length ? `Medical conditions: ${sharedConditions.join(", ")}` : null,
    pet.medical_emergency_notes && pet.share_emergency_notes
      ? `Emergency notes: ${pet.medical_emergency_notes}`
      : null,
    pet.photo_urls[0] ? `Photo: ${pet.photo_urls[0]}` : null,
    `Owner contact: ${input.ownerContact}`,
    "If this animal is brought to your clinic, please contact the owner directly."
  ].filter((line): line is string => Boolean(line));
  return lines.join("\n");
}

function renderBoloHtml(input: SendOneInput): string {
  return renderBoloText(input)
    .split("\n")
    .map((line) => `<p>${line}</p>`)
    .join("");
}
