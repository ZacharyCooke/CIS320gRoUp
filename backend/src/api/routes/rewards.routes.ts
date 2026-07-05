import { Router } from "express";
import { rewardClaimRouter } from "./rewards/reward-claim.routes.js";
import { rewardCoreRouter } from "./rewards/reward-core.routes.js";
import { rewardIdentityRouter } from "./rewards/reward-identity.routes.js";
import { rewardProximityRouter } from "./rewards/reward-proximity.routes.js";

export const rewardsRouter = Router();

rewardsRouter.use("/", rewardCoreRouter);
rewardsRouter.use("/", rewardClaimRouter);
rewardsRouter.use("/", rewardProximityRouter);
rewardsRouter.use("/", rewardIdentityRouter);
