import {
  createExternalSource,
  deleteExternalSourceById,
  findExternalSourcesByOwnerId,
  type CreateExternalSourceInput,
  type ExternalSource
} from "../models/external-source.model.js";

export async function link(input: CreateExternalSourceInput): Promise<ExternalSource> {
  return createExternalSource(input);
}

export async function unlink(ownerId: string, externalSourceId: string): Promise<boolean> {
  return deleteExternalSourceById(externalSourceId, ownerId);
}

export async function list(ownerId: string): Promise<ExternalSource[]> {
  return findExternalSourcesByOwnerId(ownerId);
}
