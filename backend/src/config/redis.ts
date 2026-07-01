import { Redis } from "ioredis";
import { env } from "./env.js";

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3
});

export async function connectRedis(): Promise<void> {
  if (redis.status === "end" || redis.status === "wait") {
    await redis.connect();
  }
}

export async function closeRedis(): Promise<void> {
  await redis.quit();
}
