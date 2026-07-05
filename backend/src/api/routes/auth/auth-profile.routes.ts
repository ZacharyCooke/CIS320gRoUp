import { Router } from "express";
import { findUserById } from "../../../models/user.model.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { authMiddleware } from "../../middleware/auth.js";

export const authProfileRouter = Router();

authProfileRouter.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const found = await findUserById(req.user!.id);
    if (!found) {
      res.status(404).json({ error: "user_not_found" });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, totp_secret, facebook_access_token_encrypted, ...safe } = found;
    res.json({ user: { ...safe, facebook_connected: !!facebook_access_token_encrypted } });
  })
);
