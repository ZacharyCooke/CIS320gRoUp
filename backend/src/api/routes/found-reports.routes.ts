import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  findFoundReportById,
  findFoundReports
} from "../../models/found-report.model.js";
import { submitFoundReport, queryByRadius, claimReport } from "../../services/found-report.service.js";
import { findSearchById } from "../../models/lost-pet-search.model.js";
import { findUserById } from "../../models/user.model.js";
import { dispatchClaimAlert } from "../../services/notification.service.js";
import { sendEmail } from "../../integrations/email.service.js";
import { sendSms } from "../../integrations/sms.service.js";

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

    const search = await findSearchById(search_id);
    if (!search || search.owner_id !== req.user!.id) {
      res.status(403).json({ error: "not_search_owner" });
      return;
    }

    const report = await claimReport(req.params.id, search_id);
    if (!report) {
      res.status(409).json({ error: "already_claimed_or_not_found" });
      return;
    }

    const reporterContact = [report.reporter_email, report.reporter_phone].filter(Boolean).join(" · ") || null;

    // FR-022a — exchange contact info both ways. The owner gets an amber
    // in-app/email/SMS notification (they have an account); the finder has no
    // account, so they're emailed/texted directly with the owner's contact info.
    await dispatchClaimAlert(search.owner_id, report.id, reporterContact);

    const owner = await findUserById(search.owner_id);
    const ownerContact = owner
      ? [owner.first_name && owner.last_name ? `${owner.first_name} ${owner.last_name}` : null, owner.email, owner.phone]
          .filter(Boolean)
          .join(" · ")
      : null;

    if (ownerContact) {
      const subject = "Your found-pet report was matched!";
      const body = `Great news — the owner confirmed this matches their pet. Their contact info: ${ownerContact}`;
      if (report.reporter_email) await sendEmail({ to: report.reporter_email, subject, text: body });
      if (report.reporter_phone) await sendSms({ to: report.reporter_phone, body: `${subject} ${body}` });
    }

    res.json({ report: { ...report, reporter_contact: reporterContact }, owner_contact: ownerContact });
  })
);
