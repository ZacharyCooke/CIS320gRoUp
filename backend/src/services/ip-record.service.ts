import { createOrUpdateIpRecord, findIpRecord } from "../models/ip-record.model.js";

// Accepts a pre-hashed value — route handlers only ever have req.ipHash (set by ip-detection middleware)
export async function storeTrustedIPHash(userId: string, ipHash: string): Promise<void> {
  await createOrUpdateIpRecord(userId, ipHash);
}

export async function isTrustedIPHash(userId: string, ipHash: string): Promise<boolean> {
  const record = await findIpRecord(userId, ipHash);
  return record?.is_trusted === true;
}
