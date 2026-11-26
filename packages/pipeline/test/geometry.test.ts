import { describe, expect, it } from "vitest";
import { Coordinate, ResortArea } from "@snowstamp/domain";
import { toPolygons } from "../src/area.js";
import type { LatLon, OsmElement } from "../src/osm.js";
import { assembleRings } from "../src/rings.js";

const p = (lon: number, lat: number): LatLon => ({ lon, lat });
const box = (w: number, s: number, e: number, n: number): LatLon[] => [p(w, s), p(e, s), p(e, n), p(w, n), p(w, s)];

describe("assembleRings", () => {
  it("keeps an already closed ring", () => {
    const { rings, unclosed } = assembleRings([box(0, 0, 1, 1)]);
    expect(rings).toHaveLength(1);
    expect(unclosed).toEqual([]);
  });

  it("joins split segments, including reversed ones", () => {
    const a = [p(0, 0), p(1, 0), p(1, 1)];
    const b = [p(0, 0), p(0, 1), p(1, 1)]; // meets a at (1,1) but runs the other way
    const { rings } = assembleRings([a, b]);
    expect(rings).toHaveLength(1);
    expect(rings[0]).toHaveLength(5);
    expect(rings[0]?.[0]).toEqual(rings[0]?.[4]);
  });

  it("reports segments that never close and ignores one-point segments", () => {
    const { rings, unclosed } = assembleRings([[p(0, 0), p(1, 0)], [p(5, 5)]]);
    expect(rings).toEqual([]);
    expect(unclosed).toHaveLength(1);
  });

  it("builds several rings", () => {
    expect(assembleRings([box(0, 0, 1, 1), box(5, 5, 6, 6)]).rings).toHaveLength(2);
  });
});

describe("toPolygons", () => {
  it("turns a closed way into one polygon", () => {
    const result = toPolygons({ type: "way", id: 1, geometry: box(0, 0, 1, 1) });
    expect("polygons" in result && result.polygons).toHaveLength(1);
  });

  it.each([
    ["an open way", { type: "way", id: 1, geometry: [p(0, 0), p(1, 0), p(1, 1), p(0, 1)] }],
    ["a way without geometry", { type: "way", id: 2 }],
    ["a node", { type: "node", id: 3 }],
  ] as [string, OsmElement][])("skips %s", (_label, element) => {
    expect("skipped" in toPolygons(element)).toBe(true);
  });

  it("assembles a relation from split outer ways and assigns a hole to its outer ring", () => {
    const relation: OsmElement = {
      type: "relation",
      id: 10,
      members: [
        { type: "way", ref: 1, role: "outer", geometry: [p(0, 0), p(10, 0), p(10, 10)] },
        { type: "way", ref: 2, role: "outer", geometry: [p(10, 10), p(0, 10), p(0, 0)] },
        { type: "way", ref: 3, role: "inner", geometry: box(4, 4, 6, 6) },
        { type: "way", ref: 4, role: "inner", geometry: box(50, 50, 51, 51) },
        { type: "node", ref: 5, role: "label" },
      ],
    };
    const result = toPolygons(relation);
    if (!("polygons" in result)) throw new Error(result.skipped);
    expect(result.polygons).toHaveLength(1);
    expect(result.polygons[0]?.holes).toHaveLength(1);

    const area = ResortArea.of(result.polygons);
    expect(area.contains(Coordinate.of(2, 8))).toBe(true);
    expect(area.contains(Coordinate.of(5, 5))).toBe(false);
  });

  it("skips relations without a closed outer ring or with a dangling outer way", () => {
    const none: OsmElement = { type: "relation", id: 11, members: [] };
    const dangling: OsmElement = {
      type: "relation",
      id: 12,
      members: [
        { type: "way", ref: 1, role: "outer", geometry: box(0, 0, 1, 1) },
        { type: "way", ref: 2, role: "outer", geometry: [p(5, 5), p(6, 6)] },
      ],
    };
    expect("skipped" in toPolygons(none)).toBe(true);
    expect("skipped" in toPolygons(dangling)).toBe(true);
  });
});
