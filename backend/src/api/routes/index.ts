import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { petsRouter } from "./pets.routes.js";
import { publicRouter } from "./public.routes.js";
import { searchRouter } from "./search.routes.js";
import { foundReportsRouter } from "./found-reports.routes.js";
import { notificationsRouter } from "./notifications.routes.js";
import { rewardsRouter, proximityCheckRouter } from "./rewards.routes.js";
import { storeRouter } from "./store.routes.js";

export const router = Router();

router.use("/auth", authRouter);
router.use("/pets", petsRouter);
router.use("/", publicRouter);
router.use("/", searchRouter);
router.use("/found-reports", foundReportsRouter);
router.use("/notifications", notificationsRouter);
router.use("/rewards", rewardsRouter);
router.use("/", proximityCheckRouter);
router.use("/store", storeRouter);
