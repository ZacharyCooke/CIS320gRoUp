import {
  createFoundReport,
  findFoundReportsInBounds,
  claimFoundReport,
  type CreateFoundReportInput,
  type FoundReport
} from "../models/found-report.model.js";
import { findActiveSearches } from "../models/lost-pet-search.model.js";
import { createSearchResult } from "../models/search-result.model.js";
import { boundingBox, haversineDistanceMiles, isWithinRadius } from "./geo.service.js";
import { notify } from "./notification.service.js";
import { emitNewResult } from "../integrations/websocket.server.js";

export async function submitFoundReport(input: CreateFoundReportInput): Promise<FoundReport> {
  const report = await createFoundReport(input);

  // Fire-and-forget: match against all active searches
  matchReportToActiveSearches(report).catch((err) =>
    console.error("[found-report] match error:", err)
  );

  return report;
}

async function matchReportToActiveSearches(report: FoundReport): Promise<void> {
  const activeSearches = await findActiveSearches();

  for (const search of activeSearches) {
    if (!isWithinRadius(search.center_lat, search.center_lng, search.radius_miles, report.lat, report.lng)) {
      continue;
    }

    const distance = haversineDistanceMiles(
      search.center_lat, search.center_lng, report.lat, report.lng
    );

    const result = await createSearchResult({
      search_id: search.id,
      source: "found_report",
      external_id: report.id,
      name: report.reporter_name ?? "Anonymous reporter",
      species: report.species,
      breed: report.breed,
      color: report.color,
      photo_url: report.photo_urls[0] ?? null,
      lat: report.lat,
      lng: report.lng,
      distance_miles: distance,
      description: report.description,
      contact_info: [report.reporter_email, report.reporter_phone].filter(Boolean).join(" | ") || null,
      found_at: report.found_at
    });

    emitNewResult(search.id, result);

    await notify({
      userId: search.owner_id,
      type: "found_report_match",
      title: "Found pet report nearby",
      body: `A ${report.species ?? "pet"} was reported found ${distance.toFixed(1)} mi from your search center.`,
      data: { search_id: search.id, report_id: report.id, result_id: result.id }
    });
  }
}

export async function queryByRadius(
  lat: number,
  lng: number,
  radiusMiles: number
): Promise<FoundReport[]> {
  const box = boundingBox(lat, lng, radiusMiles);
  const candidates = await findFoundReportsInBounds(box.minLat, box.maxLat, box.minLng, box.maxLng);
  return candidates.filter((r) => isWithinRadius(lat, lng, radiusMiles, r.lat, r.lng));
}

export async function claimReport(
  reportId: string,
  searchId: string
): Promise<FoundReport | null> {
  return claimFoundReport(reportId, searchId);
}
