import { describe, expect, it } from "vitest";
import { Continent } from "@snowstamp/domain";
import { boundingBox, boxGapKm, extractCandidates, slugify } from "../src/candidates.js";
import { OSM_ATTRIBUTION, buildCountryQuery, type LatLon, type OsmElement } from "../src/osm.js";
import { seedSql } from "../src/sql.js";

const p = (lon: number, lat: number): LatLon => ({ lon, lat });
const box = (w: number, s: number, e: number, n: number): LatLon[] => [p(w, s), p(e, s), p(e, n), p(w, n), p(w, s)];
export const way = (id: number, name: string | undefined, geometry: LatLon[]): OsmElement => ({
  type: "way",
  id,
  geometry,
  ...(name === undefined ? {} : { tags: { landuse: "winter_sports", name } }),
});

describe("slugify", () => {
  it("drops accents and generic prefixes", () => {
    expect(slugify("Estación de Esquí Aramón Formigal")).toBe("aramon-formigal");
    expect(slugify("Station de ski Les Deux Alpes")).toBe("les-deux-alpes");
    expect(slugify("Baqueira/Beret")).toBe("baqueira-beret");
  });

  it("drops connectors after the prefix but keeps proper-name articles", () => {
    expect(slugify("Estación de Esquí de La Molina")).toBe("la-molina");
    expect(slugify("Estación de Esquí de Candanchú")).toBe("candanchu");
    expect(slugify("Estación de Esquí y Montaña de Sierra Nevada")).toBe("sierra-nevada");
    expect(slugify("La Pinilla Estación de Esquí")).toBe("la-pinilla");
  });

  it("cuts a trailing sector so that sectors share the resort key", () => {
    expect(slugify("Estación Invernal y de Montaña San Isidro Sector Riopinos")).toBe("san-isidro");
    expect(slugify("Estación Invernal y de Montaña San Isidro Sector Pradera")).toBe("san-isidro");
    expect(slugify("Sector Celleros")).toBe("sector-celleros");
  });

  it("is empty when nothing usable remains", () => {
    expect(slugify("  ---  ")).toBe("");
    expect(slugify("Estación de esquí")).toBe("");
  });
});

describe("geometry helpers", () => {
  it("measures the bounding box and the gap between boxes", () => {
    const a = boundingBox([{ outer: [p(0, 0), p(1, 0), p(1, 1), p(0, 0)].map((c) => ({ longitude: c.lon, latitude: c.lat }) as never), holes: [] }]);
    expect(a).toEqual({ west: 0, south: 0, east: 1, north: 1 });
    expect(boxGapKm(a, { west: 0.5, south: 0.5, east: 2, north: 2 })).toBe(0);
    expect(boxGapKm(a, { west: 1, south: 2, east: 2, north: 3 })).toBeCloseTo(111.195, 0);
  });
});

describe("extractCandidates", () => {
  const formigal = way(100, "Estación de Esquí Aramón Formigal", box(-0.44, 42.75, -0.36, 42.8));

  it("builds a candidate with key, country and area", () => {
    const { candidates, skipped } = extractCandidates([formigal], "ES");
    expect(skipped).toEqual([]);
    expect(candidates[0]).toMatchObject({ key: "es-aramon-formigal", countryCode: "es", osmRef: "way/100", osmRefs: ["way/100"] });
    expect(candidates[0]?.areaSquareKm).toBeGreaterThan(30);
  });

  it("skips unnamed, unusable, unslugable, open and closed-down elements with a reason", () => {
    const elements: OsmElement[] = [
      way(1, undefined, box(0, 40, 1, 41)),
      way(2, "!!!", box(0, 40, 1, 41)),
      way(3, "Open", [p(0, 0), p(1, 0), p(1, 1)]),
      way(5, "Sector Celleros (abandonado)", box(0, 40, 1, 41)),
    ];
    const { candidates, skipped } = extractCandidates(elements, "es");
    expect(candidates).toEqual([]);
    expect(skipped.map((s) => s.reason)).toEqual([
      "unnamed",
      "name has no usable characters",
      "way is not a closed ring",
      "closed or abandoned",
    ]);
  });

  it("keeps every named domain, however small", () => {
    const { candidates } = extractCandidates([way(4, "Tiny Lift", box(0, 42, 0.001, 42.001))], "es");
    expect(candidates.map((c) => c.key)).toEqual(["es-tiny-lift"]);
  });

  it("merges nearby sectors of one resort into a single entry", () => {
    const elements = [
      way(1, "Estación Invernal San Isidro Sector Riopinos", box(-5.4, 43.0, -5.38, 43.02)),
      way(2, "Estación Invernal San Isidro Sector Pradera", box(-5.37, 43.0, -5.35, 43.02)),
    ];
    const { candidates } = extractCandidates(elements, "es");
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ key: "es-san-isidro", osmRefs: ["way/1", "way/2"] });
    expect(candidates[0]?.polygons).toHaveLength(2);
  });

  it("keeps two distant resorts with the same name apart, with unique keys", () => {
    const a = way(300, "Valle Nevado", box(-70.3, -33.4, -70.2, -33.3));
    const b = way(200, "Valle Nevado", box(-60.5, -33.4, -60.4, -33.3));
    const keys = extractCandidates([a, b], "cl").candidates.map((c) => c.key);
    expect(keys).toEqual(["cl-valle-nevado", "cl-valle-nevado-300"]);
  });
});

describe("seedSql and query", () => {
  const countries = [
    { code: "fr", name: "France", continent: Continent.Europe },
    { code: "es", name: "Spain", continent: Continent.Europe },
  ];

  it("emits idempotent, escaped inserts with attribution, only for countries that have resorts", () => {
    const { candidates } = extractCandidates([way(1, "Val d'Isère", box(6.9, 45.4, 7.1, 45.5))], "fr");
    const sql = seedSql(candidates, countries);
    expect(sql).toContain(OSM_ATTRIBUTION);
    expect(sql).toContain("'Val d''Isère'");
    expect(sql).toContain("insert into public.countries (code, name, continent) values ('fr', 'France', 'europe')");
    expect(sql).not.toContain("'Spain'");
    expect(sql).toContain("on conflict (key) do nothing");
    expect(sql).toContain("ST_MakeValid");
    expect(sql).toContain('"type":"MultiPolygon"');
  });

  it("builds a country query and rejects bad codes", () => {
    expect(buildCountryQuery("es")).toContain('"ISO3166-1"="ES"');
    expect(() => buildCountryQuery("spain")).toThrow();
    expect(() => buildCountryQuery('E"S')).toThrow();
  });
});
