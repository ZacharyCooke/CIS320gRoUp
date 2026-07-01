import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plainTextPassword: string): Promise<string> {
  if (plainTextPassword.length < 12) {
    throw new Error("password must be at least 12 characters");
  }

  return bcrypt.hash(plainTextPassword, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plainTextPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, passwordHash);
}

export function looksLikePasswordHash(passwordHash: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(passwordHash);
}
