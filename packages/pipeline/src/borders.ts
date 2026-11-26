import { Coordinate, Polygon, ResortArea } from "@snowstamp/domain";
import { boundingBox } from "./candidates.js";

/**
 * A resort that crosses a border counts only in the country holding most of it, unless the minority country
 * holds at least this share of it: then the split is clear and the resort is listed in both countries.
 * Provisional; the owner can tune it.
 */
export const CLEARLY_SHARED_MIN_SHARE = 0.4;
const GRID_CELLS_PER_AXIS = 7;
const MAX_VERTEX_SAMPLES = 12;

/** Points inside the resort used to ask which country each part belongs to: a grid, or vertices for thin shapes. */
export function samplePoints(polygons: readonly Polygon[]): Coordinate[] {
  const area = ResortArea.of(polygons);
  const box = boundingBox(polygons);
  const points: Coordinate[] = [];
  for (let i = 0; i < GRID_CELLS_PER_AXIS; i++) {
    for (let j = 0; j < GRID_CELLS_PER_AXIS; j++) {
      const point = Coordinate.of(
        box.west + ((box.east - box.west) * (i + 0.5)) / GRID_CELLS_PER_AXIS,
        box.south + ((box.north - box.south) * (j + 0.5)) / GRID_CELLS_PER_AXIS,
      );
      if (area.contains(point)) {
        points.push(point);
      }
    }
  }
  if (points.length > 0) {
    return points;
  }
  const vertices = polygons.flatMap((p) => p.outer.slice(0, -1));
  const step = Math.max(1, Math.floor(vertices.length / MAX_VERTEX_SAMPLES));
  return vertices.filter((_, index) => index % step === 0);
}

/** Countries a resort belongs to, biggest share first, from the share of sample points found in each. */
export function decideCountries(
  votes: ReadonlyMap<string, number>,
  clearlySharedMinShare: number = CLEARLY_SHARED_MIN_SHARE,
): string[] {
  const total = [...votes.values()].reduce((sum, v) => sum + v, 0);
  if (total === 0) {
    throw new CountryUndeterminedError();
  }
  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return ranked.filter(([, count], index) => index === 0 || count / total >= clearlySharedMinShare).map(([code]) => code);
}

export class CountryUndeterminedError extends Error {
  constructor() {
    super("No country could be determined for the resort");
    this.name = "CountryUndeterminedError";
  }
}
