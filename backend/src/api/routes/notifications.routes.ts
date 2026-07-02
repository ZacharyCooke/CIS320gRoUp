import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  findNotificationsByUserId,
  markNotificationRead,
  markAllNotificationsRead,
  countUnreadNotifications
} from "../../models/notification.model.js";

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
