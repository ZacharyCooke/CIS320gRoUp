import { createNotification, type NotificationType } from "../models/notification.model.js";
import { sendEmail } from "../integrations/email.service.js";
import { sendSms } from "../integrations/sms.service.js";
import { sendApns } from "../integrations/apns.service.js";
import { emitNotification } from "../integrations/websocket.server.js";
import { findUserById } from "../models/user.model.js";
import { findPetById, type Pet } from "../models/pet.model.js";
import type { LostPetSearch } from "../models/lost-pet-search.model.js";
import type { FoundReport } from "../models/found-report.model.js";

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  socketEvent?: string;
  triggerLat?: number;
  triggerLng?: number;
}

export async function notify(input: NotifyInput): Promise<void> {
  const notification = await createNotification({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data ?? {},
    trigger_latitude: input.triggerLat ?? null,
    trigger_longitude: input.triggerLng ?? null
  });

  // Real-time in-app push via WebSocket (user's own room)
  emitNotification(input.userId, input.socketEvent ?? "new_notification", notification);

  // Best-effort email + SMS — don't await so we don't block the response
  notifyOutOfBand(input).catch((err) =>
    console.error("[notification] out-of-band error:", err)
  );
}

async function notifyOutOfBand(input: NotifyInput): Promise<void> {
  const user = await findUserById(input.userId);
  if (!user) return;

  if (user.email) {
    try {
      await sendEmail({
        to: user.email,
        subject: input.title,
        text: input.body
      });
    } catch (err) {
      console.error("[notification] email dispatch error:", err);
    }
  }

  if (user.phone) {
    try {
      await sendSms({ to: user.phone, body: `${input.title}: ${input.body}` });
    } catch (err) {
      console.error("[notification] sms dispatch error:", err);
    }
  }

  if (user.apns_device_token) {
    try {
      await sendApns({
        deviceToken: user.apns_device_token,
        title: input.title,
        body: input.body,
        data: input.data
      });
    } catch (err) {
      console.error("[notification] apns dispatch error:", err);
    }
  }
}

export async function dispatchBOLO(
  userId: string,
  pet: Pet,
  distanceMiles: number,
  trigger: { lat: number; lng: number }
): Promise<void> {
  const user = await findUserById(userId);
  if (!user || !user.notif_bolo_alert) return;

  await notify({
    userId,
    type: "bolo_alert",
    socketEvent: "bolo_alert",
    title: `Lost ${pet.species} nearby`,
    body: `${pet.name} (${pet.breed ?? pet.species}, ${pet.color}) was reported lost ${distanceMiles.toFixed(1)} mi from you.`,
    data: { pet_name: pet.name, breed: pet.breed, color: pet.color, distance_miles: distanceMiles },
    triggerLat: trigger.lat,
    triggerLng: trigger.lng
  });
}

export async function dispatchCommunityAlert(
  userId: string,
  pet: Pet,
  distanceMiles: number,
  trigger: { lat: number; lng: number }
): Promise<void> {
  const user = await findUserById(userId);
  if (!user || !user.notif_nearby_lost) return;

  await notify({
    userId,
    type: "nearby_lost",
    socketEvent: "community_alert",
    title: "Lost pet in your community",
    body: `A ${pet.species} (${pet.color}) was reported lost ${distanceMiles.toFixed(1)} mi from you.`,
    data: { pet_name: pet.name, species: pet.species, color: pet.color, distance_miles: distanceMiles },
    triggerLat: trigger.lat,
    triggerLng: trigger.lng
  });
}

export async function dispatchProximityAlert(
  ownerId: string,
  finderUserId: string,
  rewardId: string
): Promise<void> {
  // No per-user toggle gates this — like claim_alert, it's a direct result of an
  // action the recipient just took part in, not a passive area-based alert.
  try {
    await notify({
      userId: ownerId,
      type: "claim_alert",
      socketEvent: "reward_released",
      title: "Reward released",
      body: "Proximity, pet identity, and owner identity all verified — the reward has been released to the finder.",
      data: { reward_id: rewardId }
    });
  } catch (err) {
    console.error("[notification] proximity alert (owner) error:", err);
  }

  try {
    await notify({
      userId: finderUserId,
      type: "claim_alert",
      socketEvent: "reward_released",
      title: "Reward released to you",
      body: "All verification steps passed — the reward has been released.",
      data: { reward_id: rewardId }
    });
  } catch (err) {
    console.error("[notification] proximity alert (finder) error:", err);
  }
}

export async function dispatchClaimAlert(search: LostPetSearch, report: FoundReport): Promise<void> {
  const pet = await findPetById(search.pet_id);
  const petName = pet?.name ?? "your pet";
  const finderContact =
    [report.reporter_name, report.reporter_email, report.reporter_phone].filter(Boolean).join(" | ") ||
    "no contact info provided";

  // No per-user toggle gates claim alerts — same as the existing system/found_report_match types.
  try {
    await notify({
      userId: search.owner_id,
      type: "claim_alert",
      socketEvent: "claim_alert",
      title: "Found-report match confirmed",
      body: `You claimed a found-pet report as a match for ${petName}. Finder contact: ${finderContact}`,
      data: { report_id: report.id, search_id: search.id }
    });
  } catch (err) {
    console.error("[notification] claim alert (owner) error:", err);
  }

  // Found reports are anonymous by design (no account required) — the finder has
  // no user_id, so their side of the exchange is a direct email, not an in-app Notification.
  if (report.reporter_email) {
    try {
      const owner = await findUserById(search.owner_id);
      const ownerContact = owner
        ? [owner.first_name, owner.email, owner.phone].filter(Boolean).join(" | ")
        : "unavailable";
      await sendEmail({
        to: report.reporter_email,
        subject: "Your found-pet report was claimed",
        text: `The owner has confirmed your found-pet report matches ${petName}. Owner contact: ${ownerContact}`
      });
    } catch (err) {
      console.error("[notification] claim alert (finder email) error:", err);
    }
  }
}
