import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  findFoundReportById,
  findFoundReports
} from "../../models/found-report.model.js";
import { submitFoundReport, queryByRadius, claimReport } from "../../services/found-report.service.js";

export const foundReportsRouter = Router();

const createSchema = z.object({
  reporter_name: z.string().max(120).optional().nullable(),
  reporter_email: z.string().email().optional().nullable(),
  reporter_phone: z.string().max(30).optional().nullable(),
  description: z.string().min(1).max(2000),
  species: z.string().max(60).optional().nullable(),
  breed: z.string().max(120).optional().nullable(),
  color: z.string().max(120).optional().nullable(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  found_at: z.string().datetime().optional()
});

// Public — no auth required
foundReportsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "validation_error", details: body.error.flatten() });
      return;
    }
    const report = await submitFoundReport({
      ...body.data,
      found_at: body.data.found_at ? new Date(body.data.found_at) : undefined
    });
    res.status(201).json({ report });
  })
);

foundReportsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
    const radius = req.query.radius ? parseFloat(req.query.radius as string) : null;

    if (lat !== null && lng !== null && radius !== null) {
      const reports = await queryByRadius(lat, lng, radius);
      res.json({ reports });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string ?? "50", 10), 100);
    const offset = parseInt(req.query.offset as string ?? "0", 10);
    const reports = await findFoundReports(limit, offset);
    res.json({ reports });
  })
);

foundReportsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const report = await findFoundReportById(req.params.id);
    if (!report) {
      res.status(404).json({ error: "report_not_found" });
      return;
    }
    res.json({ report });
  })
);

// Authenticated — claim a report for a search
foundReportsRouter.post(
  "/:id/claim",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { search_id } = req.body;
    if (!search_id) {
      res.status(400).json({ error: "search_id required" });
      return;
    }
    const report = await claimReport(req.params.id, search_id);
    if (!report) {
      res.status(409).json({ error: "already_claimed_or_not_found" });
      return;
    }
    res.json({ report });
  })
);
