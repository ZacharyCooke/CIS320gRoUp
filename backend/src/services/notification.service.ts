import { createNotification, type NotificationType } from "../models/notification.model.js";
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
}

export async function notify(input: NotifyInput): Promise<void> {
  const notification = await createNotification({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data ?? {}
  });

  // Real-time in-app push via WebSocket (user's own room)
  emitNewResult(`user:${input.userId}`, notification);

  // Best-effort email + SMS — don't await so we don't block the response
  notifyOutOfBand(input).catch((err) =>
    console.error("[notification] out-of-band error:", err)
  );
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
