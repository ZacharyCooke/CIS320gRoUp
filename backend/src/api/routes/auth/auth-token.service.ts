import crypto from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../../config/env.js";
import { redis } from "../../../config/redis.js";

const REFRESH_TTL_SEC = 7 * 24 * 60 * 60;
export const RT_PREFIX = "rt:";

export async function issueTokenPair(
  userId: string
): Promise<{ access_token: string; refresh_token: string }> {
  const accessTokenTtl = env.JWT_ACCESS_TOKEN_TTL as SignOptions["expiresIn"];
  const access_token = jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: accessTokenTtl
  });
  const refresh_token = crypto.randomBytes(32).toString("hex");
  await redis.setex(`${RT_PREFIX}${refresh_token}`, REFRESH_TTL_SEC, userId);
  return { access_token, refresh_token };
}

export const TIMING_DUMMY_HASH =
  "$2b$12$WXd6L7ULtEb.w9Fo0WS.k.0000000000000000000000000000000000";
