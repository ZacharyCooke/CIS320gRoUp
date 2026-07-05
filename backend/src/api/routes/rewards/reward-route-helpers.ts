import { findRewardById, type Reward } from "../../../models/reward.model.js";
import { dispatchProximityAlert } from "../../../services/notification.service.js";
import * as RewardService from "../../../services/reward.service.js";

export async function loadOwnedReward(rewardId: string, userId: string): Promise<Reward | null> {
  const reward = await findRewardById(rewardId);
  if (!reward || reward.owner_id !== userId) return null;
  return reward;
}

// Both the owner and the claimed finder call proximity endpoints, so authorization
// here means "either party to this specific reward," not just the owner.
export function isPartyToReward(reward: Reward, userId: string): boolean {
  return reward.owner_id === userId || reward.finder_user_id === userId;
}

// The three verification steps can complete in any order, so whichever endpoint
// flips all_passed to true is responsible for release and notification.
export async function releaseAndNotifyIfAllPassed(reward: Reward): Promise<void> {
  await RewardService.releaseIfAllPassed(reward.id);
  if (reward.finder_user_id) {
    dispatchProximityAlert(reward.owner_id, reward.finder_user_id, reward.id).catch((err) =>
      console.error("[reward] proximity alert dispatch error:", err)
    );
  }
}
