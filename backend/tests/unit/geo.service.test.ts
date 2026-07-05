import { haversineDistanceMiles, isWithinRadius, boundingBox } from "../../src/services/geo.service.js";

describe("haversineDistanceMiles", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineDistanceMiles(30.2672, -97.7431, 30.2672, -97.7431)).toBe(0);
  });

  it("matches a known real-world distance (Austin to Houston, ~146 miles)", () => {
    const d = haversineDistanceMiles(30.2672, -97.7431, 29.7604, -95.3698);
    expect(d).toBeGreaterThan(140);
    expect(d).toBeLessThan(150);
  });

  it("is symmetric regardless of point order", () => {
    const a = haversineDistanceMiles(30.2672, -97.7431, 29.7604, -95.3698);
    const b = haversineDistanceMiles(29.7604, -95.3698, 30.2672, -97.7431);
    expect(a).toBeCloseTo(b, 10);
  });
});

describe("isWithinRadius", () => {
  it("is inclusive at exactly the radius boundary", () => {
    // ~1 mile north of center at this latitude
    const oneMileNorth = 30.2672 + 1 / 69.0;
    const d = haversineDistanceMiles(30.2672, -97.7431, oneMileNorth, -97.7431);
    expect(isWithinRadius(30.2672, -97.7431, d, oneMileNorth, -97.7431)).toBe(true);
  });

  it("rejects a point outside the radius", () => {
    expect(isWithinRadius(30.2672, -97.7431, 1, 30.35, -97.7431)).toBe(false);
  });

  it("accepts a point well inside the radius", () => {
    expect(isWithinRadius(30.2672, -97.7431, 200, 29.7604, -95.3698)).toBe(true);
  });
});

describe("boundingBox", () => {
  it("centers the box on the given coordinate", () => {
    const box = boundingBox(30.2672, -97.7431, 10);
    expect(box.minLat).toBeLessThan(30.2672);
    expect(box.maxLat).toBeGreaterThan(30.2672);
    expect(box.minLng).toBeLessThan(-97.7431);
    expect(box.maxLng).toBeGreaterThan(-97.7431);
  });

  it("grows with a larger radius", () => {
    const small = boundingBox(30.2672, -97.7431, 5);
    const large = boundingBox(30.2672, -97.7431, 50);
    expect(large.maxLat - large.minLat).toBeGreaterThan(small.maxLat - small.minLat);
  });
});
