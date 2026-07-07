import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { getPublicProfile } from "../../services/public-profile.service.js";

// No auth middleware — this router is intentionally public (FR-009, FR-017).
export const publicRouter = Router();

publicRouter.get(
  "/p/:token",
  asyncHandler(async (req, res) => {
    const profile = await getPublicProfile(req.params.token);
    if (!profile) {
      res.status(404).json({ error: "profile_not_found" });
      return;
    }
    res.json({ profile });
  })
);
