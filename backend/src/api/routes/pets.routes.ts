import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";
import { petPhotoUpload, storePetPhoto } from "../../services/photo.service.js";
import * as externalSources from "../../services/external-source.service.js";
import * as pets from "../../services/pet.service.js";
import * as petVets from "../../services/pet-vet.service.js";
import * as trackingDevices from "../../services/tracking-device.service.js";
import { generatePNG, generateSVG, publicProfileUrl } from "../../services/qr.service.js";
import { attachPremiumStatus, enforcePetLimit } from "../middleware/premium.js";

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

export const petsRouter = Router();

petsRouter.use(authMiddleware);

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value ?? "";
}

petsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ pets: await pets.list(req.user!.id) });
  })
);

petsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const petId = param(req.params.id);
    const pet = await pets.read(req.user!.id, petId);
    if (!pet) {
      res.status(404).json({ error: "pet_not_found" });
      return;
    }
    const [tracking_devices, external_sources] = await Promise.all([
      trackingDevices.listForPet(req.user!.id, petId),
      externalSources.list(req.user!.id)
    ]);
    res.json({ pet: { ...pet, tracking_devices, external_sources } });
  })
);

petsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const deleted = await pets.remove(req.user!.id, param(req.params.id));
    res.status(deleted ? 204 : 404).send();
  })
);

petsRouter.post(
  "/",
  asyncHandler(attachPremiumStatus),
  asyncHandler(enforcePetLimit),
  asyncHandler(async (req, res) => {
    const pet = await pets.create(req.user!.id, req.body);
    res.status(201).json({ pet });
  })
);

petsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const pet = await pets.update(req.user!.id, param(req.params.id), req.body);
    if (!pet) {
      res.status(404).json({ error: "pet_not_found" });
      return;
    }

    res.json({ pet });
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
    const pet = await pets.addPhoto(req.user!.id, param(req.params.id), stored.photo_url);
    if (!pet) {
      res.status(404).json({ error: "pet_not_found" });
      return;
    }

    res.json({ photo_url: stored.photo_url, photo_urls: pet.photo_urls });
  })
);

petsRouter.post(
  "/:id/tracking-devices",
  asyncHandler(async (req, res) => {
    const trackingDevice = await trackingDevices.link(req.user!.id, {
      ...req.body,
      pet_id: param(req.params.id)
    });
    res.status(201).json({ tracking_device: trackingDevice });
  })
);

petsRouter.delete(
  "/:id/tracking-devices/:deviceId",
  asyncHandler(async (req, res) => {
    const deleted = await trackingDevices.unlink(
      req.user!.id,
      param(req.params.id),
      param(req.params.deviceId)
    );
    res.status(deleted ? 204 : 404).send();
  })
);

petsRouter.post(
  "/:id/external-sources",
  asyncHandler(async (req, res) => {
    const source = await externalSources.link({
      ...req.body,
      owner_id: req.user!.id
    });
    res.status(201).json({ external_source: source });
  })
);

petsRouter.delete(
  "/:id/external-sources/:sourceId",
  asyncHandler(async (req, res) => {
    const deleted = await externalSources.unlink(req.user!.id, param(req.params.sourceId));
    res.status(deleted ? 204 : 404).send();
  })
);

petsRouter.patch(
  "/:id/medical",
  asyncHandler(async (req, res) => {
    const parsed = medicalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "validation_error", details: parsed.error.flatten().fieldErrors });
      return;
    }
    const pet = await pets.updateMedical(req.user!.id, param(req.params.id), parsed.data);
    if (!pet) { res.status(404).json({ error: "pet_not_found" }); return; }
    res.json({ pet });
  })
);

petsRouter.put(
  "/:id/vet",
  asyncHandler(async (req, res) => {
    const parsed = vetSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "validation_error", details: parsed.error.flatten().fieldErrors });
      return;
    }
    const vet = await petVets.upsert(param(req.params.id), req.user!.id, parsed.data);
    if (!vet) { res.status(404).json({ error: "pet_not_found" }); return; }
    res.json({ vet });
  })
);

petsRouter.get(
  "/:id/vet",
  asyncHandler(async (req, res) => {
    const vet = await petVets.get(param(req.params.id), req.user!.id);
    res.json({ vet: vet ?? null });
  })
);

petsRouter.delete(
  "/:id/vet",
  asyncHandler(async (req, res) => {
    const deleted = await petVets.remove(param(req.params.id), req.user!.id);
    res.status(deleted ? 204 : 404).send();
  })
);

petsRouter.get(
  "/:id/qr",
  asyncHandler(async (req, res) => {
    const pet = await pets.read(req.user!.id, param(req.params.id));
    if (!pet) {
      res.status(404).json({ error: "pet_not_found" });
      return;
    }

    const format = param(req.query.format as string | undefined) || "json";
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
    const pet = await pets.rotateQr(req.user!.id, param(req.params.id));
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
