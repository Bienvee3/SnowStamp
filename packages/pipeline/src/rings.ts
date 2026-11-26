import type { LatLon } from "./osm.js";

const same = (a: LatLon, b: LatLon): boolean => a.lat === b.lat && a.lon === b.lon;
const MIN_CLOSED_RING_POINTS = 4;

/**
 * Joins way segments end to end into closed rings (OSM multipolygon members are split into several ways).
 * Segments are matched on exactly equal endpoints, in either direction. Returns the closed rings and the
 * segments that could not be closed.
 */
export function assembleRings(segments: readonly (readonly LatLon[])[]): {
  rings: LatLon[][];
  unclosed: LatLon[][];
} {
  const remaining = segments.filter((s) => s.length >= 2).map((s) => [...s]);
  const rings: LatLon[][] = [];
  const unclosed: LatLon[][] = [];

  while (remaining.length > 0) {
    const current = remaining.shift() as LatLon[];
    let progressed = true;
    while (progressed && !isClosed(current)) {
      progressed = false;
      const end = current[current.length - 1] as LatLon;
      const index = remaining.findIndex((s) => same(s[0] as LatLon, end) || same(s[s.length - 1] as LatLon, end));
      if (index >= 0) {
        const [next] = remaining.splice(index, 1) as [LatLon[]];
        const ordered = same(next[0] as LatLon, end) ? next : [...next].reverse();
        current.push(...ordered.slice(1));
        progressed = true;
      }
    }
    (isClosed(current) ? rings : unclosed).push(current);
  }
  return { rings, unclosed };
}

function isClosed(ring: readonly LatLon[]): boolean {
  return ring.length >= MIN_CLOSED_RING_POINTS && same(ring[0] as LatLon, ring[ring.length - 1] as LatLon);
}
