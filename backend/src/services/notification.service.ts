import {
  createNotification,
  getNotificationSettings,
  type NotificationSettings,
  type NotificationType
} from "../models/notification.model.js";
import { sendEmail } from "../integrations/email.service.js";
import { sendSms } from "../integrations/sms.service.js";
import { emitNewResult } from "../integrations/websocket.server.js";
import { findUserById } from "../models/user.model.js";

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  triggerLatitude?: number | null;
  triggerLongitude?: number | null;
}

export async function notify(input: NotifyInput): Promise<void> {
  const notification = await createNotification({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data ?? {},
    trigger_latitude: input.triggerLatitude ?? null,
    trigger_longitude: input.triggerLongitude ?? null
  });

  // Real-time in-app push via WebSocket (user's own room)
  emitNewResult(`user:${input.userId}`, notification);

  // Best-effort email + SMS — don't await so we don't block the response
  notifyOutOfBand(input).catch((err) =>
    console.error("[notification] out-of-band error:", err)
  );
}

/** Checks the user's per-category toggle before dispatching. Returns true if sent. */
async function notifyIfEnabled(
  userId: string,
  category: keyof NotificationSettings,
  input: Omit<NotifyInput, "userId">
): Promise<boolean> {
  const settings = await getNotificationSettings(userId);
  if (!settings[category]) return false;
  await notify({ userId, ...input });
  return true;
}

/** Red: owner search update (sighting, database match, vet BOLO sent). */
export async function dispatchPetUpdate(userId: string, title: string, body: string, data?: Record<string, unknown>): Promise<void> {
  await notifyIfEnabled(userId, "pet_update", { type: "pet_update", title, body, data });
}

/** Blue: user entered within 1 mile of an actively-lost pet's last known location. */
export async function dispatchBOLO(
  userId: string,
  petName: string,
  breed: string | null,
  color: string,
  distanceMiles: number,
  lat: number,
  lng: number
): Promise<void> {
  await notifyIfEnabled(userId, "bolo_alert", {
    type: "bolo_alert",
    title: `BOLO: ${petName} may be nearby`,
    body: `${petName}${breed ? ` (${breed})` : ""} — ${color} — reported lost ${distanceMiles.toFixed(1)} mi from here.`,
    data: { pet_name: petName, breed, color, distance_miles: distanceMiles },
    triggerLatitude: lat,
    triggerLongitude: lng
  });
}

/** Green: a new pet was reported lost within 2 miles of the user's location. */
export async function dispatchCommunityAlert(
  userId: string,
  petName: string,
  species: string,
  color: string,
  distanceMiles: number,
  lat: number,
  lng: number
): Promise<void> {
  await notifyIfEnabled(userId, "community_alert", {
    type: "community_alert",
    title: `A ${species} was just reported lost nearby`,
    body: `${petName} — ${color} — reported lost ${distanceMiles.toFixed(1)} mi from your location.`,
    data: { pet_name: petName, species, color, distance_miles: distanceMiles },
    triggerLatitude: lat,
    triggerLongitude: lng
  });
}

/** Amber: a finder's found-report claim was matched to an owner's pet. */
export async function dispatchClaimAlert(
  ownerId: string,
  foundReportId: string,
  reporterContact: string | null
): Promise<void> {
  await notifyIfEnabled(ownerId, "claim_alert", {
    type: "claim_alert",
    title: "Your pet may have been found",
    body: reporterContact
      ? `A found-pet report was matched to your search. Finder contact: ${reporterContact}`
      : "A found-pet report was matched to your search.",
    data: { found_report_id: foundReportId, reporter_contact: reporterContact }
  });
}

/** Amber: the owner initiated reward proximity verification — notify the finder. */
export async function dispatchProximityAlert(
  finderId: string,
  rewardId: string
): Promise<void> {
  await notifyIfEnabled(finderId, "claim_alert", {
    type: "proximity_alert",
    title: "Reward verification started",
    body: "The owner has started proximity verification to release your reward. Open the app to confirm your location.",
    data: { reward_id: rewardId }
  });
}

async function notifyOutOfBand(input: NotifyInput): Promise<void> {
  const user = await findUserById(input.userId);
  if (!user) return;

  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: input.title,
      text: input.body
    });
  }

  if (user.phone) {
    await sendSms({ to: user.phone, body: `${input.title}: ${input.body}` });
  }
}
