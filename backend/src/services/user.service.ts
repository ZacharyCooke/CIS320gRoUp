import {
  createUser,
  findUserByEmail,
  findUserById,
  markUserContactVerified,
  type User
} from "../models/user.model.js";
import { hashPassword, looksLikePasswordHash } from "./password.service.js";

type VerificationChannel = "email" | "phone";

interface PendingOtp {
  code: string;
  expiresAt: number;
  attempts: number;
}

export interface RegisterUserInput {
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  password?: string;
  password_hash?: string;
}

export interface RegisterUserResult {
  user: User;
  verification_codes: Partial<Record<VerificationChannel, string>>;
}

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 3;
const pendingOtps = new Map<string, PendingOtp>();

function otpKey(userId: string, channel: VerificationChannel): string {
  return `${userId}:${channel}`;
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function setPendingOtp(userId: string, channel: VerificationChannel): string {
  const code = generateOtp();
  pendingOtps.set(otpKey(userId, channel), {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0
  });
  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev-otp] ${channel}:${userId} = ${code}`);
  }
  return code;
}

export async function register(input: RegisterUserInput): Promise<RegisterUserResult> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new Error("email already registered");
  }

  const password_hash =
    input.password_hash ??
    (input.password ? await hashPassword(input.password) : undefined);

  if (!password_hash || !looksLikePasswordHash(password_hash)) {
    throw new Error("valid bcrypt password hash required");
  }

  const user = await createUser({
    first_name: input.first_name ?? null,
    last_name: input.last_name ?? null,
    email: input.email,
    phone: input.phone ?? null,
    password_hash
  });

  const verification_codes: Partial<Record<VerificationChannel, string>> = {
    email: setPendingOtp(user.id, "email")
  };

  if (user.phone) {
    verification_codes.phone = setPendingOtp(user.id, "phone");
  }

  return { user, verification_codes };
}

export async function verifyOTP(
  userId: string,
  channel: VerificationChannel,
  code: string
): Promise<boolean> {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error("user not found");
  }

  const key = otpKey(userId, channel);
  const pending = pendingOtps.get(key);

  if (!pending || pending.expiresAt < Date.now()) {
    pendingOtps.delete(key);
    return false;
  }

  if (pending.attempts >= MAX_VERIFY_ATTEMPTS) {
    return false;
  }

  pending.attempts += 1;

  if (pending.code !== code) {
    return false;
  }

  await markUserContactVerified(userId, channel);
  pendingOtps.delete(key);
  return true;
}
