import { Coordinate, Polygon, ResortArea } from "@snowstamp/domain";
import type { LatLon, OsmElement } from "./osm.js";
import { assembleRings } from "./rings.js";

const toRing = (points: readonly LatLon[]): Coordinate[] => points.map((p) => Coordinate.of(p.lon, p.lat));

export type AreaResult = { polygons: Polygon[] } | { skipped: string };

/**
 * Builds the polygons of one OSM element: a closed way is one polygon; a multipolygon relation joins its
 * outer ways into rings and assigns each inner ring to the outer ring that contains it.
 */
export function toPolygons(element: OsmElement): AreaResult {
  if (element.type === "way") {
    const points = element.geometry ?? [];
    const first = points[0];
    const last = points[points.length - 1];
    const closed = first !== undefined && last !== undefined && first.lat === last.lat && first.lon === last.lon;
    if (!closed || points.length < 4) {
      return { skipped: "way is not a closed ring" };
    }
    return { polygons: [{ outer: toRing(points), holes: [] }] };
  }

  if (element.type !== "relation") {
    return { skipped: `unsupported element type ${element.type}` };
  }
  const members = (element.members ?? []).filter((m) => m.type === "way" && m.geometry !== undefined);
  const outers = assembleRings(members.filter((m) => m.role !== "inner").map((m) => m.geometry as LatLon[]));
  if (outers.rings.length === 0) {
    return { skipped: "relation has no closed outer ring" };
  }
  if (outers.unclosed.length > 0) {
    return { skipped: "relation has outer ways that do not close" };
  }
  const inners = assembleRings(members.filter((m) => m.role === "inner").map((m) => m.geometry as LatLon[]));

  const polygons: Polygon[] = outers.rings.map((ring) => ({ outer: toRing(ring), holes: [] as Coordinate[][] }));
  for (const inner of inners.rings) {
    const innerRing = toRing(inner);
    const probe = innerRing[0] as Coordinate;
    const owner = polygons.find((p) => ResortArea.of([{ outer: p.outer, holes: [] }]).contains(probe));
    if (owner !== undefined) {
      (owner.holes as Coordinate[][]).push(innerRing);
    }
  }
  return { polygons };
}
