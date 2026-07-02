import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { petsRouter } from "./pets.routes.js";
import { searchRouter } from "./search.routes.js";

export const router = Router();

router.use("/auth", authRouter);
router.use("/pets", petsRouter);
router.use("/", searchRouter);  // mounts /pets/:id/mark-lost, /searches/:id/*

router.use("/found-reports", (_req, res) => {
  res.status(501).json({ error: "found report routes not implemented yet" });
});

router.use("/notifications", (_req, res) => {
  res.status(501).json({ error: "notification routes not implemented yet" });
});
