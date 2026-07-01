import type { NextFunction, Request, Response } from "express";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const message = error instanceof Error ? error.message : "Unexpected error";
  res.status(500).json({
    error: "internal_server_error",
    message
  });
}
