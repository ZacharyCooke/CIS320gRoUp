import { pool } from "../config/database.js";

export type NotificationType =
  | "found_report_match"
  | "search_complete"
  | "system"
  | "pet_update"
  | "bolo_alert"
  | "nearby_lost"
  | "store_account"
  | "claim_alert";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  trigger_latitude: number | null;
  trigger_longitude: number | null;
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
