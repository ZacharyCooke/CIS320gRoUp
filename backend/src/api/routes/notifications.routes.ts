import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  findNotificationsByUserId,
  markNotificationRead,
  markAllNotificationsRead,
  countUnreadNotifications
} from "../../models/notification.model.js";
import { updateNotificationSettings, updateApnsDeviceToken } from "../../models/user.model.js";

export const notificationsRouter = Router();
notificationsRouter.use(authMiddleware);

notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string ?? "50", 10), 100);
    const notifications = await findNotificationsByUserId(req.user!.id, limit);
    const unread = await countUnreadNotifications(req.user!.id);
    res.json({ notifications, unread });
  })
);

notificationsRouter.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const notification = await markNotificationRead(req.params.id, req.user!.id);
    if (!notification) {
      res.status(404).json({ error: "notification_not_found" });
      return;
    }
    res.json({ notification });
  })
);

notificationsRouter.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await markAllNotificationsRead(req.user!.id);
    res.json({ ok: true });
  })
);

const settingsSchema = z.object({
  notif_pet_update: z.boolean().optional(),
  notif_bolo_alert: z.boolean().optional(),
  notif_nearby_lost: z.boolean().optional(),
  notif_store_account: z.boolean().optional()
});

// 200: settings updated, 400: validation error, 401: missing/invalid token
notificationsRouter.patch(
  "/settings",
  asyncHandler(async (req, res) => {
    const body = settingsSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "validation_error", details: body.error.flatten() });
      return;
    }
    const user = await updateNotificationSettings(req.user!.id, body.data);
    res.json({
      settings: {
        notif_pet_update: user?.notif_pet_update,
        notif_bolo_alert: user?.notif_bolo_alert,
        notif_nearby_lost: user?.notif_nearby_lost,
        notif_store_account: user?.notif_store_account
      }
    });
  })
);

const deviceTokenSchema = z.object({
  token: z.string().min(10)
});

// 200: token stored, 400: validation error, 401: missing/invalid token
notificationsRouter.post(
  "/device-token",
  asyncHandler(async (req, res) => {
    const body = deviceTokenSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "validation_error", details: body.error.flatten() });
      return;
    }
    await updateApnsDeviceToken(req.user!.id, body.data.token);
    res.json({ ok: true });
  })
);
