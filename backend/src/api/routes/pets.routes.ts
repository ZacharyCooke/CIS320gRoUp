import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";
import { parseOr400 } from "../middleware/validate.js";
import { petPhotoUpload, storePetPhoto } from "../../services/photo.service.js";
import * as externalSources from "../../services/external-source.service.js";
import * as pets from "../../services/pet.service.js";
import * as petVets from "../../services/pet-vet.service.js";
import * as trackingDevices from "../../services/tracking-device.service.js";
import { generatePNG, generateSVG, publicProfileUrl } from "../../services/qr.service.js";

const medicalSchema = z.object({
  medical_conditions: z
    .array(z.object({ condition: z.string().min(1), share_publicly: z.boolean() }))
    .default([]),
  medical_emergency_notes: z.string().nullable().optional(),
  share_emergency_notes: z.boolean().default(true)
});

const vetSchema = z.object({
  clinic_name: z.string().min(1),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional()
});

const trackingDeviceSchema = z.object({
  device_type: z.enum(["airtag", "amazon_tag"]),
  share_url: z.string().url(),
  last_known_latitude: z.number().optional(),
  last_known_longitude: z.number().optional()
});

const externalSourceSchema = z.object({
  source_name: z.string().min(1),
  source_url: z.string().url(),
  source_type: z.enum(["petfinder_api", "petfbi_scrape", "manual_link", "facebook_groups"])
});

// POST /pets and PUT /pets/:id have no schema for the rest of the body
// (pre-existing gap, unrelated to this) — this validates only the new
// temperament/temperament_custom invariant. Its parsed output is discarded;
// req.body is still passed to pets.create()/update() as-is, so this can't
// accidentally strip any other field from the request.
const temperamentSchema = z
  .object({
    temperament: z.enum(["friendly", "cautious", "report_only", "custom"]).optional(),
    temperament_custom: z.string().trim().min(1).nullable().optional()
  })
  .refine((data) => data.temperament !== "custom" || Boolean(data.temperament_custom?.trim()), {
    message: "temperament_custom is required when temperament is 'custom'",
    path: ["temperament_custom"]
  });

export const petsRouter = Router();

petsRouter.use(authMiddleware);

petsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ pets: await pets.list(req.user!.id) });
  })
);

petsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const pet = await pets.read(req.user!.id, req.params.id);
    if (!pet) {
      res.status(404).json({ error: "pet_not_found" });
      return;
    }
    res.json({ pet });
  })
);

// POST /pets — 201, 401, 403 pet_limit_reached (non-premium owner at the free-tier cap)
petsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!parseOr400(temperamentSchema, req.body, res, "fields")) return;
    try {
      const pet = await pets.create(req.user!.id, req.body);
      res.status(201).json({ pet });
    } catch (err) {
      if (err instanceof pets.PetLimitReachedError) {
        res.status(403).json({ error: "pet_limit_reached", message: err.message });
        return;
      }
      throw err;
    }
  })
);

petsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!parseOr400(temperamentSchema, req.body, res, "fields")) return;
    const pet = await pets.update(req.user!.id, req.params.id, req.body);
    if (!pet) {
      res.status(404).json({ error: "pet_not_found" });
      return;
    }

    res.json({ pet });
  })
);

// DELETE /pets/:id — 204, 401, 404 pet_not_found, 409 pet_has_active_search | pet_has_active_reward
petsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const deleted = await pets.remove(req.user!.id, req.params.id);
      res.status(deleted ? 204 : 404).send();
    } catch (err) {
      if (err instanceof pets.PetHasActiveSearchError) {
        res.status(409).json({ error: "pet_has_active_search", message: err.message });
        return;
      }
      if (err instanceof pets.PetHasActiveRewardError) {
        res.status(409).json({ error: "pet_has_active_reward", message: err.message });
        return;
      }
      throw err;
    }
  })
);

petsRouter.post(
  "/:id/photo",
  petPhotoUpload.single("photo"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "photo_required" });
      return;
    }

    const stored = await storePetPhoto(req.file);
    const pet = await pets.addPhoto(req.user!.id, req.params.id, stored.photo_url);
    if (!pet) {
      res.status(404).json({ error: "pet_not_found" });
      return;
    }

    res.json({ photo_url: stored.photo_url, photo_urls: pet.photo_urls });
  })
);

petsRouter.get(
  "/:id/tracking-devices",
  asyncHandler(async (req, res) => {
    const devices = await trackingDevices.listForPet(req.user!.id, req.params.id);
    res.json({ tracking_devices: devices });
  })
);

petsRouter.post(
  "/:id/tracking-devices",
  asyncHandler(async (req, res) => {
    const parsed = parseOr400(trackingDeviceSchema, req.body, res, "fields");
    if (!parsed) return;
    const trackingDevice = await trackingDevices.link(req.user!.id, {
      ...parsed,
      pet_id: req.params.id
    });
    res.status(201).json({ tracking_device: trackingDevice });
  })
);

petsRouter.delete(
  "/:id/tracking-devices/:deviceId",
  asyncHandler(async (req, res) => {
    const deleted = await trackingDevices.unlink(
      req.user!.id,
      req.params.id,
      req.params.deviceId
    );
    res.status(deleted ? 204 : 404).send();
  })
);

petsRouter.get(
  "/:id/external-sources",
  asyncHandler(async (req, res) => {
    // External sources belong to the owner's account, not a specific pet
    // (see data-model.md) — the :id here is only used to confirm the caller
    // actually owns a pet before showing their account-wide linked sources.
    const pet = await pets.read(req.user!.id, req.params.id);
    if (!pet) {
      res.status(404).json({ error: "pet_not_found" });
      return;
    }
    const sources = await externalSources.list(req.user!.id);
    res.json({ external_sources: sources });
  })
);

petsRouter.post(
  "/:id/external-sources",
  asyncHandler(async (req, res) => {
    const parsed = parseOr400(externalSourceSchema, req.body, res, "fields");
    if (!parsed) return;
    const source = await externalSources.link({
      ...parsed,
      owner_id: req.user!.id
    });
    res.status(201).json({ external_source: source });
  })
);

petsRouter.delete(
  "/:id/external-sources/:sourceId",
  asyncHandler(async (req, res) => {
    const deleted = await externalSources.unlink(req.user!.id, req.params.sourceId);
    res.status(deleted ? 204 : 404).send();
  })
);

petsRouter.patch(
  "/:id/medical",
  asyncHandler(async (req, res) => {
    const parsed = parseOr400(medicalSchema, req.body, res, "fields");
    if (!parsed) return;
    const pet = await pets.updateMedical(req.user!.id, req.params.id, parsed);
    if (!pet) { res.status(404).json({ error: "pet_not_found" }); return; }
    res.json({ pet });
  })
);

petsRouter.put(
  "/:id/vet",
  asyncHandler(async (req, res) => {
    const parsed = parseOr400(vetSchema, req.body, res, "fields");
    if (!parsed) return;
    const vet = await petVets.upsert(req.params.id, req.user!.id, parsed);
    if (!vet) { res.status(404).json({ error: "pet_not_found" }); return; }
    res.json({ vet });
  })
);

petsRouter.get(
  "/:id/vet",
  asyncHandler(async (req, res) => {
    const vet = await petVets.get(req.params.id, req.user!.id);
    res.json({ vet: vet ?? null });
  })
);

petsRouter.delete(
  "/:id/vet",
  asyncHandler(async (req, res) => {
    const deleted = await petVets.remove(req.params.id, req.user!.id);
    res.status(deleted ? 204 : 404).send();
  })
);

petsRouter.get(
  "/:id/qr",
  asyncHandler(async (req, res) => {
    const pet = await pets.read(req.user!.id, req.params.id);
    if (!pet) {
      res.status(404).json({ error: "pet_not_found" });
      return;
    }

    const format = (req.query.format as string | undefined) || "json";
    if (format === "svg") {
      const svg = await generateSVG(pet.qr_code_token);
      res.type("image/svg+xml").send(svg);
      return;
    }

    const png = await generatePNG(pet.qr_code_token);
    res.json({
      token: pet.qr_code_token,
      profile_url: publicProfileUrl(pet.qr_code_token),
      png_data_url: png
    });
  })
);

petsRouter.post(
  "/:id/rotate-qr",
  asyncHandler(async (req, res) => {
    const pet = await pets.rotateQr(req.user!.id, req.params.id);
    if (!pet) {
      res.status(404).json({ error: "pet_not_found" });
      return;
    }
    res.json({
      token: pet.qr_code_token,
      profile_url: publicProfileUrl(pet.qr_code_token)
    });
  })
);
