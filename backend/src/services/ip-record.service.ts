import { hashIpAddress } from "../api/middleware/ip-detection.js";
import { createOrUpdateIpRecord, findIpRecord } from "../models/ip-record.model.js";

export { hashIpAddress as hashIP };

// Accept raw IP address — hashing is done internally
export async function storeTrustedIP(userId: string, ipAddress: string): Promise<void> {
  await createOrUpdateIpRecord(userId, hashIpAddress(ipAddress));
}

export async function isTrustedIP(userId: string, ipAddress: string): Promise<boolean> {
  const record = await findIpRecord(userId, hashIpAddress(ipAddress));
  return record?.is_trusted === true;
}

// Accept pre-hashed value — used by route handlers that only have req.ipHash
export async function storeTrustedIPHash(userId: string, ipHash: string): Promise<void> {
  await createOrUpdateIpRecord(userId, ipHash);
}

export async function isTrustedIPHash(userId: string, ipHash: string): Promise<boolean> {
  const record = await findIpRecord(userId, ipHash);
  return record?.is_trusted === true;
}
