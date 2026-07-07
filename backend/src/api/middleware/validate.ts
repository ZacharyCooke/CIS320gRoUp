import type { Response } from "express";
import type { ZodType, ZodTypeDef } from "zod";

// Two response shapes are in use across existing routes: some send the full
// flatten() (formErrors + fieldErrors), others send just fieldErrors. Both are
// preserved here rather than unified, since changing either is an API
// contract change (per CLAUDE.md) that needs its own versioning decision.
type DetailsShape = "full" | "fields";

// Parses `data` against `schema`, writing a 400 validation_error response and
// returning undefined on failure. Callers must `return` immediately when this
// returns undefined — it does not throw.
//
// Output/Input are kept as separate type params (mirroring ZodType's own
// signature) so schemas using .default()/.coerce() infer the post-parse
// Output type here, not the pre-parse Input type.
export function parseOr400<Output, Input = Output>(
  schema: ZodType<Output, ZodTypeDef, Input>,
  data: unknown,
  res: Response,
  shape: DetailsShape = "full"
): Output | undefined {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const details = shape === "fields" ? parsed.error.flatten().fieldErrors : parsed.error.flatten();
    res.status(400).json({ error: "validation_error", details });
    return undefined;
  }
  return parsed.data;
}
