import { Polygon, ResortArea, ResortKey, isResortSized, MIN_RESORT_AREA_SQUARE_KM } from "@snowstamp/domain";
import { toPolygons } from "./area.js";
import type { OsmElement } from "./osm.js";

export interface Candidate {
  readonly osmRef: string;
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
  return words.join("-");
}

/**
 * Turns OSM winter-sports polygons into resort candidates. Unnamed elements, unusable geometries and
 * areas below the size threshold are skipped with a reason, never dropped silently. Keys are unique:
 * on a name collision the later (by OSM id) candidate gets the OSM id appended.
 */
export function extractCandidates(
  elements: readonly OsmElement[],
  countryCode: string,
  minSquareKm: number = MIN_RESORT_AREA_SQUARE_KM,
): ExtractionResult {
  const candidates: Candidate[] = [];
  const skipped: Skipped[] = [];
  const usedKeys = new Set<string>();
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
    const area = ResortArea.of(result.polygons);
    if (!isResortSized(area, minSquareKm)) {
      skipped.push({ osmRef, name, reason: `area ${area.areaSquareKm().toFixed(2)} km2 below ${minSquareKm} km2` });
      continue;
    }
    let key = `${country}-${slug}`;
    if (usedKeys.has(key)) {
      key = `${key}-${element.id}`;
    }
    usedKeys.add(ResortKey.of(key).value);
    candidates.push({
      osmRef,
      key,
      name,
      countryCode: country,
      polygons: result.polygons,
      areaSquareKm: area.areaSquareKm(),
    });
  }
  return { candidates, skipped };
}
