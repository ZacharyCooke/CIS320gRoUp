import crypto from "node:crypto";
import { env } from "../config/env.js";
import { redis } from "../config/redis.js";
import { sendPasswordResetEmail } from "../integrations/email.service.js";
import { findUserByEmail, updateUserPassword } from "../models/user.model.js";
import { hashPassword } from "./password.service.js";

const RESET_TOKEN_PREFIX = "pwreset:";
const RESET_TOKEN_TTL_SEC = 30 * 60;

export async function requestPasswordReset(email: string): Promise<string | null> {
  const user = await findUserByEmail(email);
  if (!user) {
    // Deliberately a no-op: responding identically whether or not the email
    // is registered prevents using this endpoint to enumerate accounts.
    return null;
  }

  const token = crypto.randomBytes(32).toString("hex");
  await redis.setex(`${RESET_TOKEN_PREFIX}${token}`, RESET_TOKEN_TTL_SEC, user.id);

  const resetUrl = `${env.PUBLIC_WEB_URL}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  // Returned so the route can optionally surface it outside production,
  // mirroring /register's _dev_otp — there's no real email provider in
  // dev/test, so without this the link is only visible in server logs.
  return token;
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const key = `${RESET_TOKEN_PREFIX}${token}`;
  const userId = await redis.get(key);

  if (!userId) {
    return false;
  }

  await redis.del(key);
  const passwordHash = await hashPassword(newPassword);
  await updateUserPassword(userId, passwordHash);
  return true;
}
