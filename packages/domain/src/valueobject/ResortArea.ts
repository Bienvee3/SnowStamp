import { InvalidGeometryError } from "../exception/DomainError.js";
import { Coordinate } from "./Coordinate.js";

/** A closed ring: first and last coordinate are equal, at least 4 coordinates. */
export type Ring = readonly Coordinate[];

/** One polygon: an outer ring and zero or more holes. */
export interface Polygon {
  readonly outer: Ring;
  readonly holes: readonly Ring[];
}

const MIN_RING_LENGTH = 4;

function validateRing(ring: Ring, label: string): void {
  if (ring.length < MIN_RING_LENGTH) {
    throw new InvalidGeometryError(`${label} needs at least ${MIN_RING_LENGTH} coordinates`);
  }
  const first = ring[0] as Coordinate;
  const last = ring[ring.length - 1] as Coordinate;
  if (!first.equals(last)) {
    throw new InvalidGeometryError(`${label} must be closed (first equals last coordinate)`);
  }
}

function isOnSegment(p: Coordinate, a: Coordinate, b: Coordinate): boolean {
  const cross =
    (p.latitude - a.latitude) * (b.longitude - a.longitude) -
    (p.longitude - a.longitude) * (b.latitude - a.latitude);
  if (cross !== 0) {
    return false;
  }
  return (
    p.longitude >= Math.min(a.longitude, b.longitude) &&
    p.longitude <= Math.max(a.longitude, b.longitude) &&
    p.latitude >= Math.min(a.latitude, b.latitude) &&
    p.latitude <= Math.max(a.latitude, b.latitude)
  );
}

type RingPosition = "inside" | "boundary" | "outside";

/** Even-odd ray casting with an explicit boundary check. Planar approximation in degrees. */
function locateInRing(point: Coordinate, ring: Ring): RingPosition {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i] as Coordinate;
    const b = ring[j] as Coordinate;
    if (isOnSegment(point, a, b)) {
      return "boundary";
    }
    const crosses =
      a.latitude > point.latitude !== b.latitude > point.latitude &&
      point.longitude <
        ((b.longitude - a.longitude) * (point.latitude - a.latitude)) / (b.latitude - a.latitude) +
          a.longitude;
    if (crosses) {
      inside = !inside;
    }
  }
  return inside ? "inside" : "outside";
}

/**
 * The skiable domain of a resort (marked pistes and operating lifts) as a WGS84 MultiPolygon.
 * A point on the outer boundary counts as inside. A point inside a hole counts as outside.
 * Planar approximation: valid for areas of resort size, not for polygons crossing the antimeridian.
 */
export class ResortArea {
  private constructor(private readonly polygons: readonly Polygon[]) {}

  static of(polygons: readonly Polygon[]): ResortArea {
    if (polygons.length === 0) {
      throw new InvalidGeometryError("A resort area needs at least one polygon");
    }
    polygons.forEach((polygon, index) => {
      validateRing(polygon.outer, `Polygon ${index} outer ring`);
      polygon.holes.forEach((hole, holeIndex) =>
        validateRing(hole, `Polygon ${index} hole ${holeIndex}`),
      );
    });
    return new ResortArea(
      polygons.map((p) => ({ outer: [...p.outer], holes: p.holes.map((h) => [...h]) })),
    );
  }

  contains(point: Coordinate): boolean {
    return this.polygons.some((polygon) => {
      const inOuter = locateInRing(point, polygon.outer);
      if (inOuter === "outside") {
        return false;
      }
      if (inOuter === "boundary") {
        return true;
      }
      return polygon.holes.every((hole) => locateInRing(point, hole) !== "inside");
    });
  }
}
