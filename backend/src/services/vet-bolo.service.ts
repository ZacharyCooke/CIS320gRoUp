import crypto from "node:crypto";
import { findNearbyVetClinics, type NearbyVetClinic } from "../integrations/google-places.client.js";
import { sendEmail } from "../integrations/email.service.js";
import { createVetBolo, type VetBolo } from "../models/vet-bolo.model.js";
import { emitVetBoloSent } from "../integrations/websocket.server.js";
import { findUserById } from "../models/user.model.js";
import type { Pet } from "../models/pet.model.js";
import type { LostPetSearch } from "../models/lost-pet-search.model.js";

export async function dispatchVetBolos(
  search: LostPetSearch,
  pet: Pet,
  clinics: NearbyVetClinic[]
): Promise<VetBolo[]> {
  // One trace ID per dispatch batch so every clinic's outcome for this
  // mark-lost event can be correlated back to the same request in logs.
  const traceId = crypto.randomUUID();
  console.log(
    `[vet-bolo] trace=${traceId} search=${search.id} pet=${pet.id} dispatching to ${clinics.length} clinic(s)`
  );

  const owner = await findUserById(pet.owner_id);
  const dispatched: VetBolo[] = [];

  for (const clinic of clinics) {
    const emailStatus = clinic.clinic_email
      ? await sendBoloEmail(clinic.clinic_email, pet, owner).then(
          () => {
            console.log(`[vet-bolo] trace=${traceId} clinic="${clinic.clinic_name}" email_status=sent`);
            return "sent" as const;
          },
          (err) => {
            console.error(`[vet-bolo] trace=${traceId} clinic="${clinic.clinic_name}" SendGrid dispatch error:`, err);
            return "failed" as const;
          }
        )
      : (() => {
          console.log(`[vet-bolo] trace=${traceId} clinic="${clinic.clinic_name}" email_status=failed (no email on file)`);
          return "failed" as const;
        })();

    const bolo = await createVetBolo({
      search_id: search.id,
      pet_id: pet.id,
      clinic_name: clinic.clinic_name,
      clinic_address: clinic.clinic_address,
      clinic_email: clinic.clinic_email,
      latitude: clinic.latitude,
      longitude: clinic.longitude,
      distance_miles: clinic.distance_miles,
      email_status: emailStatus
    });

    emitVetBoloSent(search.id, { clinic_name: bolo.clinic_name, email_status: bolo.email_status });
    dispatched.push(bolo);
  }

  return dispatched;
}

async function sendBoloEmail(
  to: string,
  pet: Pet,
  owner: { first_name: string | null; last_name: string | null; email: string; phone: string | null } | null
): Promise<void> {
  const ownerName = [owner?.first_name, owner?.last_name].filter(Boolean).join(" ") || "the owner";
  const ownerContact = [owner?.email, owner?.phone].filter(Boolean).join(" / ") || "unknown";

  // medical_emergency_notes is always included on vet BOLOs regardless of share_emergency_notes —
  // it's safety-critical information for a treating clinic, unlike the public QR profile.
  const sharedConditions = pet.medical_conditions
    .filter((c) => c.share_publicly)
    .map((c) => c.condition);

  const lines = [
    `A lost pet matching your clinic's area has been reported.`,
    ``,
    `Name: ${pet.name}`,
    `Species: ${pet.species}`,
    `Breed: ${pet.breed ?? "Unknown"}`,
    `Color: ${pet.color}`,
    pet.microchip_number ? `Microchip: ${pet.microchip_number}` : null,
    sharedConditions.length ? `Medical conditions: ${sharedConditions.join(", ")}` : null,
    pet.medical_emergency_notes ? `Emergency notes: ${pet.medical_emergency_notes}` : null,
    ``,
    `Owner: ${ownerName} (${ownerContact})`,
    pet.photo_urls[0] ? `Photo: ${pet.photo_urls[0]}` : null
  ].filter((line): line is string => line !== null);

  await sendEmail({
    to,
    subject: `BOLO: Lost ${pet.species} in your area — ${pet.name}`,
    text: lines.join("\n")
  });
}
