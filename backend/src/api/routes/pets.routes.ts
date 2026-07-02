import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";
import { petPhotoUpload, storePetPhoto } from "../../services/photo.service.js";
import * as externalSources from "../../services/external-source.service.js";
import * as pets from "../../services/pet.service.js";
import * as trackingDevices from "../../services/tracking-device.service.js";

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
    const pet = await pets.read(req.user!.id, param(req.params.id));
    if (!pet) {
      res.status(404).json({ error: "pet_not_found" });
      return;
    }
    res.json({ pet });
  })
);

petsRouter.post(
  "/",
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
