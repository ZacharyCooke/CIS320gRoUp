import QRCode from "qrcode";
import speakeasy from "speakeasy";
import {
  enableUserTwoFactor,
  findUserById,
  updateUserTotpSecret
} from "../models/user.model.js";
import { decryptSecret, encryptSecret } from "../config/encryption.js";

export interface TotpSetupResult {
  secret: string;
  qr_uri: string;
  qr_image_url: string;
}

export async function setupSecret(userId: string): Promise<TotpSetupResult> {
  const user = await findUserById(userId);
  if (!user) throw new Error("user not found");

  const generated = speakeasy.generateSecret({
    name: `PetRecovery (${user.email})`,
    issuer: "PetRecovery",
    length: 20
  });

  await updateUserTotpSecret(userId, encryptSecret(generated.base32));

  const qr_image_url = await QRCode.toDataURL(generated.otpauth_url!);

  return {
    secret: generated.base32,
    qr_uri: generated.otpauth_url!,
    qr_image_url
  };
}

export function generateQRUri(secret: string, email: string): string {
  return speakeasy.otpauthURL({
    secret,
    label: encodeURIComponent(`PetRecovery:${email}`),
    issuer: "PetRecovery",
    encoding: "base32"
  });
}

export async function verifyCode(userId: string, token: string): Promise<boolean> {
  const user = await findUserById(userId);
  if (!user?.totp_secret) return false;

  let secret: string;
  try {
    secret = decryptSecret(user.totp_secret);
  } catch {
    // Pre-encryption plaintext secrets, or a corrupted value, can never verify.
    return false;
  }

  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1
  });
}

export async function enableTwoFactor(userId: string): Promise<void> {
  await enableUserTwoFactor(userId);
}
