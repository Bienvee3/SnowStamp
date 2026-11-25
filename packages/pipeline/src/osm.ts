/** Minimal shape of an Overpass JSON element returned with `out geom;`. */
export interface LatLon {
  readonly lat: number;
  readonly lon: number;
}

export interface OsmMember {
  readonly type: string;
  readonly ref: number;
  readonly role: string;
  readonly geometry?: readonly LatLon[];
}

export interface OsmElement {
  readonly type: "way" | "relation" | "node";
  readonly id: number;
  readonly tags?: Readonly<Record<string, string>>;
  readonly geometry?: readonly LatLon[];
  readonly members?: readonly OsmMember[];
}

export const OSM_ATTRIBUTION = "Data from OpenStreetMap contributors, licensed under the ODbL (https://www.openstreetmap.org/copyright).";

/** Overpass query: every winter-sports polygon (way or relation) inside a country, with geometry. */
export function buildCountryQuery(isoCode: string): string {
  if (!/^[A-Za-z]{2}$/.test(isoCode)) {
    throw new Error(`Invalid ISO 3166-1 alpha-2 code: "${isoCode}"`);
  }
  const iso = isoCode.toUpperCase();
  return [
    "[out:json][timeout:180];",
    `area["ISO3166-1"="${iso}"][admin_level=2]->.country;`,
    '(way["landuse"="winter_sports"](area.country);relation["landuse"="winter_sports"](area.country););',
    "out geom;",
  ].join("");
}
