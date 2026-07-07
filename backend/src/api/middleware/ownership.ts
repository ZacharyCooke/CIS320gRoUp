import type { Response } from "express";

// Narrows `resource` to non-null and confirms it belongs to `ownerId`, writing
// the given status/error response otherwise. Callers must `return` immediately
// when this returns false.
export function assertOwned<T extends { owner_id: string }>(
  resource: T | null,
  ownerId: string,
  res: Response,
  error: string,
  status: 404 | 403 = 404
): resource is T {
  if (!resource || resource.owner_id !== ownerId) {
    res.status(status).json({ error });
    return false;
  }
  return true;
}
