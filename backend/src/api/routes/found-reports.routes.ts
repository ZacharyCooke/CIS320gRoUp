import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.js";
import { assertOwned } from "../middleware/ownership.js";
import { parseOr400 } from "../middleware/validate.js";
import {
  findFoundReportById,
  findFoundReports,
  type FoundReport
} from "../../models/found-report.model.js";
import { findSearchById } from "../../models/lost-pet-search.model.js";
import { submitFoundReport, queryByRadius, claimReport } from "../../services/found-report.service.js";
import { foundReportPhotoUpload, storeFoundReportPhoto } from "../../services/photo.service.js";

export const foundReportsRouter = Router();

// Per contracts/api-search.md: finder email/phone is redacted for unauthenticated
// viewers. Anonymous finders' email/phone must not be readable by anyone who
// simply knows or guesses a report ID.
function sanitizeForViewer(report: FoundReport, isAuthenticated: boolean): FoundReport {
  if (isAuthenticated) return report;
  return { ...report, reporter_email: null, reporter_phone: null };
}

// multipart/form-data sends every non-file field as a string, so numeric
// fields must be coerced rather than required as z.number().
const createSchema = z.object({
  reporter_name: z.string().max(120).optional().nullable(),
  reporter_email: z.string().email().optional().nullable(),
  reporter_phone: z.string().max(30).optional().nullable(),
  description: z.string().min(1).max(2000),
  species: z.string().max(60).optional().nullable(),
  breed: z.string().max(120).optional().nullable(),
  color: z.string().max(120).optional().nullable(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  found_at: z.string().datetime().optional()
});

// Public — no auth required
foundReportsRouter.post(
  "/",
  optionalAuthMiddleware,
  foundReportPhotoUpload.single("photo"),
  asyncHandler(async (req, res) => {
    const body = parseOr400(createSchema, req.body, res);
    if (!body) return;
    if (!req.user && !body.reporter_email && !body.reporter_phone) {
      res.status(400).json({ error: "finder_contact_required" });
      return;
    }

    const photo_urls: string[] = [];
    if (req.file) {
      const stored = await storeFoundReportPhoto(req.file);
      photo_urls.push(stored.photo_url);
    }

    const report = await submitFoundReport({
      ...body,
      photo_urls,
      found_at: body.found_at ? new Date(body.found_at) : undefined
    });
    res.status(201).json({ report });
  })
);

foundReportsRouter.get(
  "/",
  optionalAuthMiddleware,
  asyncHandler(async (req, res) => {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
    const radius = req.query.radius ? parseFloat(req.query.radius as string) : null;
    const isAuthenticated = !!req.user;

    if (lat !== null && lng !== null && radius !== null) {
      const reports = await queryByRadius(lat, lng, radius);
      res.json({ reports: reports.map((r) => sanitizeForViewer(r, isAuthenticated)) });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string ?? "50", 10), 100);
    const offset = parseInt(req.query.offset as string ?? "0", 10);
    const reports = await findFoundReports(limit, offset);
    res.json({ reports: reports.map((r) => sanitizeForViewer(r, isAuthenticated)) });
  })
);

foundReportsRouter.get(
  "/:id",
  optionalAuthMiddleware,
  asyncHandler(async (req, res) => {
    const report = await findFoundReportById(req.params.id);
    if (!report) {
      res.status(404).json({ error: "report_not_found" });
      return;
    }
    res.json({ report: sanitizeForViewer(report, !!req.user) });
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
    const search = await findSearchById(search_id);
    if (!assertOwned(search, req.user!.id, res, "search_not_found")) return;
    const report = await claimReport(req.params.id, search_id);
    if (!report) {
      res.status(409).json({ error: "already_claimed_or_not_found" });
      return;
    }
    res.json({ report });
  })
);
