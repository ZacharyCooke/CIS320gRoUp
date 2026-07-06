import { pool } from "../config/database.js";

export type NotificationType =
  | "found_report_match"
  | "search_complete"
  | "system"
  | "pet_update"
  | "bolo_alert"
  | "community_alert"
  | "claim_alert"
  | "proximity_alert";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  trigger_latitude: number | null;
  trigger_longitude: number | null;
  read: boolean;
  created_at: Date;
}

export interface CreateNotificationInput {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  trigger_latitude?: number | null;
  trigger_longitude?: number | null;
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification> {
  const result = await pool.query<Notification>(
    `INSERT INTO notifications (user_id, type, title, body, data, trigger_latitude, trigger_longitude)
     VALUES ($1, $2::notification_type, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.user_id,
      input.type,
      input.title,
      input.body,
      JSON.stringify(input.data ?? {}),
      input.trigger_latitude ?? null,
      input.trigger_longitude ?? null
    ]
  );
  return result.rows[0];
}

export interface NotificationSettings {
  pet_update: boolean;
  bolo_alert: boolean;
  community_alert: boolean;
  claim_alert: boolean;
}

export async function getNotificationSettings(userId: string): Promise<NotificationSettings> {
  const result = await pool.query<NotificationSettings>(
    `SELECT notif_pet_update AS pet_update,
            notif_bolo_alert AS bolo_alert,
            notif_community_alert AS community_alert,
            notif_claim_alert AS claim_alert
     FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0] ?? { pet_update: true, bolo_alert: true, community_alert: true, claim_alert: true };
}

export async function updateNotificationSettings(
  userId: string,
  updates: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const result = await pool.query<NotificationSettings>(
    `UPDATE users
     SET notif_pet_update = COALESCE($2, notif_pet_update),
         notif_bolo_alert = COALESCE($3, notif_bolo_alert),
         notif_community_alert = COALESCE($4, notif_community_alert),
         notif_claim_alert = COALESCE($5, notif_claim_alert),
         updated_at = now()
     WHERE id = $1
     RETURNING notif_pet_update AS pet_update,
               notif_bolo_alert AS bolo_alert,
               notif_community_alert AS community_alert,
               notif_claim_alert AS claim_alert`,
    [
      userId,
      updates.pet_update ?? null,
      updates.bolo_alert ?? null,
      updates.community_alert ?? null,
      updates.claim_alert ?? null
    ]
  );
  return result.rows[0];
}

export async function findNotificationsByUserId(
  userId: string,
  limit = 50
): Promise<Notification[]> {
  const result = await pool.query<Notification>(
    "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
    [userId, limit]
  );
  return result.rows;
}

export async function markNotificationRead(
  id: string,
  userId: string
): Promise<Notification | null> {
  const result = await pool.query<Notification>(
    "UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *",
    [id, userId]
  );
  return result.rows[0] ?? null;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await pool.query(
    "UPDATE notifications SET read = true WHERE user_id = $1 AND read = false",
    [userId]
  );
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false",
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}
