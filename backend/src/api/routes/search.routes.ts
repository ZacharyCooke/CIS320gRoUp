import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  createLostPetSearch,
  deleteActiveSearchLocationsByPetId,
  findActiveSearchByPetId,
  findSearchById,
  updateSearchRadius,
  updateSearchStatus
} from "../../models/lost-pet-search.model.js";
import { findResultsBySearchId } from "../../models/search-result.model.js";
import { findPetById, updatePetStatus } from "../../models/pet.model.js";
import { runSearch } from "../../services/search-aggregator.service.js";

export const searchRouter = Router();

function param(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v ?? "";
}

const markLostSchema = z.object({
  center_lat: z.number(),
  center_lng: z.number(),
  radius_miles: z.number().min(1).max(500).default(10)
});

const patchSearchSchema = z.object({
  radius_miles: z.number().min(1).max(500).optional(),
  status: z.enum(["active", "paused", "closed"]).optional()
});

// POST /pets/:id/mark-lost
searchRouter.post(
  "/pets/:id/mark-lost",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const petId = param(req.params.id);
    const ownerId = req.user!.id;

    const pet = await findPetById(petId);
    if (!pet || pet.owner_id !== ownerId) {
      res.status(404).json({ error: "pet_not_found" });
      return;
    }

    const body = markLostSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "validation_error", details: body.error.flatten() });
      return;
    }

    const existing = await findActiveSearchByPetId(petId);
    if (existing) {
      res.status(409).json({ error: "active_search_exists", search_id: existing.id });
      return;
    }

    await updatePetStatus(petId, ownerId, "lost");

    const search = await createLostPetSearch({
      pet_id: petId,
      owner_id: ownerId,
      center_lat: body.data.center_lat,
      center_lng: body.data.center_lng,
      radius_miles: body.data.radius_miles
    });

    // Fire-and-forget — results stream via WebSocket
    runSearch(search, pet.species).catch((err) =>
      console.error("[search] aggregator error:", err)
    );

    res.status(201).json({ search });
  })
);

// POST /pets/:id/mark-recovered
searchRouter.post(
  "/pets/:id/mark-recovered",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const petId = param(req.params.id);
    const ownerId = req.user!.id;

    const pet = await findPetById(petId);
    if (!pet || pet.owner_id !== ownerId) {
      res.status(404).json({ error: "pet_not_found" });
      return;
    }

    const search = await findActiveSearchByPetId(petId);
    if (search) {
      await updateSearchStatus(search.id, ownerId, "closed");
    }

    await updatePetStatus(petId, ownerId, "safe");
    await deleteActiveSearchLocationsByPetId(petId);

    res.json({ pet_id: petId, status: "safe", search_closed: !!search });
  })
);

// GET /searches/:id/results
searchRouter.get(
  "/searches/:id/results",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const searchId = param(req.params.id);
    const ownerId = req.user!.id;

    const search = await findSearchById(searchId);
    if (!search || search.owner_id !== ownerId) {
      res.status(404).json({ error: "search_not_found" });
      return;
    }

    const results = await findResultsBySearchId(searchId);
    res.json({ search, results });
  })
);

// PATCH /searches/:id
searchRouter.patch(
  "/searches/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const searchId = param(req.params.id);
    const ownerId = req.user!.id;

    const body = patchSearchSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "validation_error", details: body.error.flatten() });
      return;
    }

    let search = await findSearchById(searchId);
    if (!search || search.owner_id !== ownerId) {
      res.status(404).json({ error: "search_not_found" });
      return;
    }

    if (body.data.radius_miles !== undefined) {
      search = (await updateSearchRadius(searchId, ownerId, body.data.radius_miles)) ?? search;
    }
    if (body.data.status !== undefined) {
      search = (await updateSearchStatus(searchId, ownerId, body.data.status)) ?? search;
      if (body.data.status === "closed") {
        await deleteActiveSearchLocationsByPetId(search.pet_id);
      }
    }

    res.json({ search });
  })
);
