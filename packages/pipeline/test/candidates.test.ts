import { describe, expect, it } from "vitest";
import { extractCandidates, slugify } from "../src/candidates.js";
import { OSM_ATTRIBUTION, buildCountryQuery, type LatLon, type OsmElement } from "../src/osm.js";
import { seedSql } from "../src/sql.js";

const p = (lon: number, lat: number): LatLon => ({ lon, lat });
const box = (w: number, s: number, e: number, n: number): LatLon[] => [p(w, s), p(e, s), p(e, n), p(w, n), p(w, s)];
const way = (id: number, name: string | undefined, geometry: LatLon[]): OsmElement => ({
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
    expect(slugify("Estación Invernal y de Montaña San Isidro Sector Riopinos")).toBe("san-isidro-sector-riopinos");
    expect(slugify("La Pinilla Estación de Esquí")).toBe("la-pinilla");
  });

  it("is empty when nothing usable remains", () => {
    expect(slugify("  ---  ")).toBe("");
    expect(slugify("Estación de esquí")).toBe("");
  });
});

describe("extractCandidates", () => {
  const formigal = way(100, "Estación de Esquí Aramón Formigal", box(-0.44, 42.75, -0.36, 42.8));

  it("builds a candidate with key, country and area", () => {
    const { candidates, skipped } = extractCandidates([formigal], "ES");
    expect(skipped).toEqual([]);
    expect(candidates[0]).toMatchObject({ key: "es-aramon-formigal", countryCode: "es", osmRef: "way/100" });
    expect(candidates[0]?.areaSquareKm).toBeGreaterThan(30);
  });

  it("skips unnamed, unusable, unslugable, open and tiny elements with a reason", () => {
    const elements: OsmElement[] = [
      way(1, undefined, box(0, 40, 1, 41)),
      way(2, "!!!", box(0, 40, 1, 41)),
      way(3, "Open", [p(0, 0), p(1, 0), p(1, 1)]),
      way(4, "Tiny Lift", box(0, 42, 0.001, 42.001)),
      way(5, "Sector Celleros (abandonado)", box(0, 40, 1, 41)),
    ];
    const { candidates, skipped } = extractCandidates(elements, "es");
    expect(candidates).toEqual([]);
    expect(skipped.map((s) => s.reason)).toEqual([
      "unnamed",
      "name has no usable characters",
      "way is not a closed ring",
      expect.stringContaining("below"),
      "closed or abandoned",
    ]);
  });

  it("respects the minimum area parameter", () => {
    expect(extractCandidates([formigal], "es", 100000).candidates).toEqual([]);
  });

  it("keeps keys unique, ordering by OSM id", () => {
    const a = way(300, "Valle Nevado", box(-70.3, -33.4, -70.2, -33.3));
    const b = way(200, "Valle Nevado", box(-70.5, -33.4, -70.4, -33.3));
    const keys = extractCandidates([a, b], "cl").candidates.map((c) => c.key);
    expect(keys).toEqual(["cl-valle-nevado", "cl-valle-nevado-300"]);
  });
});

describe("seedSql and query", () => {
  it("emits idempotent, escaped inserts with attribution", () => {
    const { candidates } = extractCandidates([way(1, "Val d'Isère", box(6.9, 45.4, 7.1, 45.5))], "fr");
    const sql = seedSql(candidates);
    expect(sql).toContain(OSM_ATTRIBUTION);
    expect(sql).toContain("'Val d''Isère'");
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
