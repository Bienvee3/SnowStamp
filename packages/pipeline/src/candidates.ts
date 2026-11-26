import { Coordinate, Polygon, ResortArea, ResortKey } from "@snowstamp/domain";
import { toPolygons } from "./area.js";
import type { OsmElement } from "./osm.js";

export interface Candidate {
  readonly osmRef: string;
  /** Every OSM element merged into this resort (several sectors become one resort). */
  readonly osmRefs: readonly string[];
  readonly key: string;
  readonly name: string;
  readonly countryCode: string;
  readonly polygons: readonly Polygon[];
  readonly areaSquareKm: number;
}

export interface Skipped {
  readonly osmRef: string;
  readonly name: string | null;
  readonly reason: string;
}

export interface ExtractionResult {
  readonly candidates: readonly Candidate[];
  readonly skipped: readonly Skipped[];
}

/** Generic words dropped from the front of a name before building the key. */
const GENERIC_PREFIXES = [
  "estacion invernal y de montana",
  "estacion invernal de",
  "estacion invernal",
  "estacion de esqui y montana",
  "estacion esqui",
  "estacion de esqui",
  "estacio d esqui",
  "estacio d'esqui",
  "estacion de montana",
  "station de ski",
  "domaine skiable",
  "ski resort",
  "skigebiet",
  "stazione sciistica",
  "centro de esqui",
  "centro de ski",
];

/** Connector words dropped right after a generic prefix (not proper-name articles such as "la"). */
const LEADING_CONNECTORS = new Set(["de", "del", "d", "y", "montana"]);
/** A name continues with a sector of the same resort after one of these words. */
const SECTOR_WORDS = new Set(["sector", "sectores", "sektor"]);
const GENERIC_SUFFIX = / estacion de esqui$/;
/** Names that mark a closed or abandoned area: it must not count as a resort. */
const INACTIVE_NAME = /abandon|cerrad|closed|disused/i;

const stripAccents = (text: string): string => text.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Lowercase ASCII slug: `Estación de Esquí Aramón Formigal` -> `aramon-formigal`. */
export function slugify(name: string): string {
  let text = stripAccents(name).toLowerCase().trim();
  for (const prefix of GENERIC_PREFIXES) {
    if (text.startsWith(prefix)) {
      text = text.slice(prefix.length);
      break;
    }
  }
  const words = text.replace(GENERIC_SUFFIX, "").split(/[^a-z0-9]+/).filter((w) => w !== "");
  while (words.length > 1 && LEADING_CONNECTORS.has(words[0] as string)) {
    words.shift();
  }
  // "San Isidro Sector Riopinos" and "San Isidro Sector Pradera" are sectors of one resort.
  const sector = words.findIndex((w, index) => index > 0 && SECTOR_WORDS.has(w));
  return (sector === -1 ? words : words.slice(0, sector)).join("-");
}

/** Elements of one name closer than this (gap between bounding boxes) are sectors of the same resort. */
export const SECTOR_MERGE_MAX_GAP_KM = 15;
const KM_PER_DEGREE = 111.195;

interface Entry {
  readonly id: number;
  readonly osmRef: string;
  readonly name: string;
  readonly slug: string;
  readonly polygons: readonly Polygon[];
  readonly area: number;
}

export interface Box {
  readonly west: number;
  readonly south: number;
  readonly east: number;
  readonly north: number;
}

export function boundingBox(polygons: readonly Polygon[]): Box {
  const points = polygons.flatMap((p) => p.outer);
  const lons = points.map((c: Coordinate) => c.longitude);
  const lats = points.map((c: Coordinate) => c.latitude);
  return { west: Math.min(...lons), south: Math.min(...lats), east: Math.max(...lons), north: Math.max(...lats) };
}

/** Approximate distance in km between two bounding boxes (0 when they overlap). */
export function boxGapKm(a: Box, b: Box): number {
  const dLat = Math.max(0, a.south - b.north, b.south - a.north) * KM_PER_DEGREE;
  const midLat = (Math.max(a.south, b.south) + Math.min(a.north, b.north)) / 2;
  const dLon = Math.max(0, a.west - b.east, b.west - a.east) * KM_PER_DEGREE * Math.cos((midLat * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

/** Groups entries of the same slug whose boxes are within the merge gap (transitively). */
function clusterSectors(entries: readonly Entry[]): Entry[][] {
  const clusters: Entry[][] = [];
  for (const entry of entries) {
    const box = boundingBox(entry.polygons);
    const near = clusters.filter((cluster) =>
      cluster.some((other) => boxGapKm(box, boundingBox(other.polygons)) <= SECTOR_MERGE_MAX_GAP_KM),
    );
    const merged = [entry, ...near.flat()];
    for (const cluster of near) {
      clusters.splice(clusters.indexOf(cluster), 1);
    }
    clusters.push(merged);
  }
  return clusters;
}

/**
 * Turns OSM winter-sports polygons into one candidate per resort. Unnamed, closed-down or unusable elements
 * are skipped with a reason, never dropped silently; there is no size threshold (every named domain counts).
 * Elements with the same name close to each other are sectors and merge into one MultiPolygon. Keys are
 * unique: a second, distant resort with the same name gets its smallest OSM id appended.
 */
export function extractCandidates(elements: readonly OsmElement[], countryCode: string): ExtractionResult {
  const skipped: Skipped[] = [];
  const bySlug = new Map<string, Entry[]>();
  const country = countryCode.toLowerCase();

  for (const element of [...elements].sort((a, b) => a.id - b.id)) {
    const osmRef = `${element.type}/${element.id}`;
    const name = element.tags?.["name"]?.trim() ?? "";
    if (name === "") {
      skipped.push({ osmRef, name: null, reason: "unnamed" });
      continue;
    }
    if (INACTIVE_NAME.test(name)) {
      skipped.push({ osmRef, name, reason: "closed or abandoned" });
      continue;
    }
    const slug = slugify(name);
    if (slug === "") {
      skipped.push({ osmRef, name, reason: "name has no usable characters" });
      continue;
    }
    const result = toPolygons(element);
    if ("skipped" in result) {
      skipped.push({ osmRef, name, reason: result.skipped });
      continue;
    }
    const entry: Entry = {
      id: element.id,
      osmRef,
      name,
      slug,
      polygons: result.polygons,
      area: ResortArea.of(result.polygons).areaSquareKm(),
    };
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), entry]);
  }

  const candidates: Candidate[] = [];
  const usedKeys = new Set<string>();
  const clusters = [...bySlug.entries()].flatMap(([slug, entries]) =>
    clusterSectors(entries).map((cluster) => ({ slug, cluster: cluster.sort((a, b) => a.id - b.id) })),
  );
  for (const { slug, cluster } of clusters.sort((a, b) => (a.cluster[0] as Entry).id - (b.cluster[0] as Entry).id)) {
    const first = cluster[0] as Entry;
    const largest = cluster.reduce((best, e) => (e.area > best.area ? e : best));
    let key = `${country}-${slug}`;
    if (usedKeys.has(key)) {
      key = `${key}-${first.id}`;
    }
    usedKeys.add(ResortKey.of(key).value);
    const polygons = cluster.flatMap((e) => e.polygons);
    candidates.push({
      osmRef: first.osmRef,
      osmRefs: cluster.map((e) => e.osmRef),
      key,
      name: largest.name,
      countryCode: country,
      polygons,
      areaSquareKm: ResortArea.of(polygons).areaSquareKm(),
    });
  }
  return { candidates, skipped };
}
