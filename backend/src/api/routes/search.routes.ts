import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";
import { assertOwned } from "../middleware/ownership.js";
import { parseOr400 } from "../middleware/validate.js";
import {
  createLostPetSearch,
  deleteActiveSearchLocationsByPetId,
  findActiveSearchByPetId,
  findActiveSearchesByOwnerId,
  findActiveSearchesInBounds,
  findSearchById,
  updateSearchRadius,
  updateSearchStatus
} from "../../models/lost-pet-search.model.js";
import { boundingBox, fuzzLocation, haversineDistanceMiles } from "../../services/geo.service.js";
import { findResultsBySearchId } from "../../models/search-result.model.js";
import { findPetById, updatePetStatus } from "../../models/pet.model.js";
import { findUserById } from "../../models/user.model.js";
import { runSearch } from "../../services/search-aggregator.service.js";
import { findNearbyVetClinics } from "../../integrations/google-places.client.js";
import { dispatchVetBolos } from "../../services/vet-bolo.service.js";
import { findVetBolosBySearchId } from "../../models/vet-bolo.model.js";
import { findActiveRewardByPetId } from "../../models/reward.model.js";
import { cancel as cancelReward } from "../../services/reward.service.js";
import { clearLastKnownLocationByPetId } from "../../models/tracking-device.model.js";
import crypto from "node:crypto";

export const searchRouter = Router();

const BOLO_ALERT_RADIUS_MILES = 5;

// Community Map privacy: a lost pet's originally-reported location is shown
// to the wider community only as a point somewhere within this radius of the
// true location - not the exact spot, which is often someone's home. Actual
// sightings (found reports) and tracking-device pings are NOT fuzzed, since
// those are the signals that actually help recover the pet. The BOLO/vet
// discovery radius search (mark-lost, above) always uses the true
// coordinates directly and is unaffected by this.
const MISSING_PET_LOCATION_FUZZ_FEET = 300;

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
    const petId = req.params.id;
    const ownerId = req.user!.id;

    const pet = await findPetById(petId);
    if (!assertOwned(pet, ownerId, res, "pet_not_found")) return;

    const body = parseOr400(markLostSchema, req.body, res);
    if (!body) return;

    const existing = await findActiveSearchByPetId(petId);
    if (existing) {
      res.status(409).json({ error: "active_search_exists", search_id: existing.id });
      return;
    }

    await updatePetStatus(petId, ownerId, "lost");

    const search = await createLostPetSearch({
      pet_id: petId,
      owner_id: ownerId,
      center_lat: body.center_lat,
      center_lng: body.center_lng,
      radius_miles: body.radius_miles
    });

    // Fire-and-forget — results stream via WebSocket
    runSearch(search, pet.species).catch((err) =>
      console.error("[search] aggregator error:", err)
    );

    // Clinic discovery is fast and cached, so we await it to report a count; the actual
    // email sends run in the background so a slow/down SendGrid never blocks this response.
    const clinics = await findNearbyVetClinics(body.center_lat, body.center_lng, BOLO_ALERT_RADIUS_MILES);
    dispatchVetBolos(search, pet, clinics).catch((err) =>
      console.error("[vet-bolo] dispatch error:", err)
    );

    const owner = await findUserById(ownerId);
    res.status(201).json({ search, vet_bolos_dispatched: clinics.length, is_premium: owner?.is_premium ?? false });
  })
);

// GET /searches/mine — every active search the current owner has, used to
// power a "Find a Pet" nav entry that isn't tied to a specific pet's URL
searchRouter.get(
  "/searches/mine",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const searches = await findActiveSearchesByOwnerId(req.user!.id);
    res.json({ searches });
  })
);

// POST /pets/:id/mark-recovered
searchRouter.post(
  "/pets/:id/mark-recovered",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const petId = req.params.id;
    const ownerId = req.user!.id;

    const pet = await findPetById(petId);
    if (!assertOwned(pet, ownerId, res, "pet_not_found")) return;

    const search = await findActiveSearchByPetId(petId);
    if (search) {
      await updateSearchStatus(search.id, ownerId, "closed");
    }

    await updatePetStatus(petId, ownerId, "safe");
    await deleteActiveSearchLocationsByPetId(petId);
    await clearLastKnownLocationByPetId(petId);

    // A pet recovered outside the app's own proximity-verification flow (e.g.
    // found and returned directly) means any still-open reward should be
    // refunded automatically rather than left dangling in escrow. A reward
    // mid-verification is left alone — cancel() rejects that on purpose.
    let rewardRefunded = false;
    const activeReward = await findActiveRewardByPetId(petId);
    if (activeReward) {
      try {
        const result = await cancelReward(ownerId, activeReward.id, {
          idempotency_key: `auto-cancel-mark-recovered-${crypto.randomUUID()}`
        });
        rewardRefunded = result.refund_initiated;
      } catch (err) {
        console.error("[reward] auto-cancel on mark-recovered skipped:", { petId, rewardId: activeReward.id, reason: (err as Error).message });
      }
    }

    res.json({ pet_id: petId, status: "safe", search_closed: !!search, reward_refunded: rewardRefunded });
  })
);

// GET /pets/:id/active-search
searchRouter.get(
  "/pets/:id/active-search",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const petId = req.params.id;
    const ownerId = req.user!.id;

    const pet = await findPetById(petId);
    if (!assertOwned(pet, ownerId, res, "pet_not_found")) return;

    const search = await findActiveSearchByPetId(petId);
    res.json({ search });
  })
);

// GET /searches/:id/results
searchRouter.get(
  "/searches/:id/results",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const searchId = req.params.id;
    const ownerId = req.user!.id;

    const search = await findSearchById(searchId);
    if (!assertOwned(search, ownerId, res, "search_not_found")) return;

    const pet = await findPetById(search.pet_id);
    const results = await findResultsBySearchId(searchId);
    res.json({ search: { ...search, pet_species: pet?.species ?? null, pet_name: pet?.name ?? null }, results });
  })
);

// GET /searches/:id/vet-bolos
searchRouter.get(
  "/searches/:id/vet-bolos",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const searchId = req.params.id;
    const ownerId = req.user!.id;

    const search = await findSearchById(searchId);
    if (!assertOwned(search, ownerId, res, "forbidden", 403)) return;

    const vetBolos = await findVetBolosBySearchId(searchId);
    res.json({ search_id: searchId, vet_bolos: vetBolos, total: vetBolos.length });
  })
);

// GET /searches/nearby — active lost-pet searches near a location, for the
// Community Map; any logged-in user may browse (not just the search's owner).
const nearbySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_miles: z.coerce.number().min(0.5).max(500).default(25)
});

searchRouter.get(
  "/searches/nearby",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const parsed = parseOr400(nearbySchema, req.query, res);
    if (!parsed) return;
    const { lat, lng, radius_miles: radius } = parsed;

    const box = boundingBox(lat, lng, radius);
    const candidates = await findActiveSearchesInBounds(box.minLat, box.maxLat, box.minLng, box.maxLng);

    const nearby = candidates
      .map((c) => ({
        ...c,
        distance_miles: haversineDistanceMiles(lat, lng, c.center_lat, c.center_lng)
      }))
      .filter((c) => c.distance_miles <= radius)
      .sort((a, b) => a.distance_miles - b.distance_miles)
      // distance_miles is computed above from the true center — fuzzing 300ft
      // doesn't meaningfully change a mile-scale distance. owner_id is
      // internal (used only for the "is this your own pet" check on the client).
      .map(({ center_lat, center_lng, ...pet }) => {
        const fuzzed = fuzzLocation(center_lat, center_lng, pet.search_id, MISSING_PET_LOCATION_FUZZ_FEET);
        return {
          ...pet,
          last_seen_lat: fuzzed.lat,
          last_seen_lng: fuzzed.lng
        };
      });

    res.json({ missing_pets: nearby, total: nearby.length });
  })
);

// PATCH /searches/:id
searchRouter.patch(
  "/searches/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const searchId = req.params.id;
    const ownerId = req.user!.id;

    const body = parseOr400(patchSearchSchema, req.body, res);
    if (!body) return;

    let search = await findSearchById(searchId);
    if (!assertOwned(search, ownerId, res, "search_not_found")) return;

    if (body.radius_miles !== undefined) {
      search = (await updateSearchRadius(searchId, ownerId, body.radius_miles)) ?? search;
    }
    if (body.status !== undefined) {
      search = (await updateSearchStatus(searchId, ownerId, body.status)) ?? search;
      if (body.status === "closed") {
        await deleteActiveSearchLocationsByPetId(search.pet_id);
      }
    }

    res.json({ search });
  })
);
