import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../../errors.js";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.code, message: error.message });
    return;
  }

  // Never leak raw error messages/stack traces for unexpected failures — log
  // server-side, return a generic message + code to the client.
  console.error("Unhandled error:", error);
  res.status(500).json({ error: "internal_server_error", message: "Something went wrong. Please try again." });
}
