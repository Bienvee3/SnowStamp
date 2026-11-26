import { describe, expect, it } from "vitest";
import { Continent, Coordinate, ProviderFailureError } from "@snowstamp/domain";
import { CLEARLY_SHARED_MIN_SHARE, CountryUndeterminedError, decideCountries, samplePoints } from "../src/borders.js";
import { CONTINENT_OVERRIDES, parseCountries } from "../src/countries.js";
import type { LatLon, OsmElement } from "../src/osm.js";
import { buildCountryOfPointsQuery, countVotes, lookupCountryVotes, runOverpass, type Fetch } from "../src/overpass.js";
import { buildWorld, type WorldDeps } from "../src/world.js";

const p = (lon: number, lat: number): LatLon => ({ lon, lat });
const box = (w: number, s: number, e: number, n: number): LatLon[] => [p(w, s), p(e, s), p(e, n), p(w, n), p(w, s)];
const way = (id: number, name: string, geometry: LatLon[]): OsmElement => ({
  type: "way",
  id,
  geometry,
  tags: { landuse: "winter_sports", name },
});

describe("decideCountries", () => {
  it("keeps only the majority country when the minority is small", () => {
    expect(decideCountries(new Map([["es", 9], ["ad", 1]]))).toEqual(["es"]);
  });

  it("keeps both countries when the split is clear", () => {
    expect(decideCountries(new Map([["fr", 6], ["ch", 4]]))).toEqual(["fr", "ch"]);
    expect(CLEARLY_SHARED_MIN_SHARE).toBe(0.4);
  });

  it("breaks an exact tie by country code and rejects no votes", () => {
    expect(decideCountries(new Map([["it", 5], ["at", 5]]))).toEqual(["at", "it"]);
    expect(() => decideCountries(new Map())).toThrow(CountryUndeterminedError);
  });
});

describe("samplePoints", () => {
  const square = { outer: [Coordinate.of(0, 0), Coordinate.of(1, 0), Coordinate.of(1, 1), Coordinate.of(0, 1), Coordinate.of(0, 0)], holes: [] };

  it("samples a grid inside the resort", () => {
    const points = samplePoints([square]);
    expect(points).toHaveLength(49);
    expect(points.every((c) => c.longitude > 0 && c.longitude < 1)).toBe(true);
  });

  it("falls back to vertices when the shape is too thin for the grid (an L-shaped sliver)", () => {
    const thin = { outer: [[0, 0], [10, 0], [10, 0.0001], [0.0001, 0.0001], [0.0001, 10], [0, 10], [0, 0]].map(([lon, lat]) => Coordinate.of(lon as number, lat as number)), holes: [] };
    const points = samplePoints([thin]);
    expect(points.length).toBeGreaterThan(0);
    expect(points).toHaveLength(6);
  });
});

describe("overpass helpers", () => {
  it("builds one is_in statement per point and counts votes", () => {
    const query = buildCountryOfPointsQuery([Coordinate.of(1.5, 42.5), Coordinate.of(1.6, 42.6)]);
    expect(query).toContain("is_in(42.5,1.5)->.a0;");
    expect(query).toContain("is_in(42.6,1.6)->.a1;");
    const votes = countVotes([
      { type: "node", id: 1, tags: { iso: "AD", i: "0" } },
      { type: "node", id: 2, tags: { iso: "ES", i: "1" } },
      { type: "node", id: 3, tags: { iso: "ES", i: "1" } },
      { type: "node", id: 4 },
    ]);
    expect([...votes]).toEqual([["ad", 1], ["es", 2]]);
  });

  it("looks votes up through the query runner", async () => {
    const votes = await lookupCountryVotes([Coordinate.of(1, 2)], async () => [{ type: "node", id: 1, tags: { iso: "FR" } }]);
    expect(votes.get("fr")).toBe(1);
  });

  const reply = (status: number, body: unknown = {}): Awaited<ReturnType<Fetch>> => ({
    ok: status === 200,
    status,
    text: async () => `status ${status}`,
    json: async () => body,
  });

  it("retries a rate-limited answer and then succeeds", async () => {
    const answers = [reply(429), reply(200, { elements: [{ type: "way", id: 7 }] })];
    const waits: number[] = [];
    const elements = await runOverpass("q", async () => answers.shift() as never, async (ms) => void waits.push(ms));
    expect(elements).toEqual([{ type: "way", id: 7 }]);
    expect(waits).toEqual([20000]);
  });

  it("retries a dropped connection and reports it as a provider failure when it persists", async () => {
    const waits: number[] = [];
    const flaky = [new TypeError("fetch failed"), reply(200, { elements: [] })];
    const next = async () => {
      const item = flaky.shift();
      if (item instanceof Error) {
        throw item;
      }
      return item as never;
    };
    expect(await runOverpass("q", next, async (ms) => void waits.push(ms))).toEqual([]);
    expect(waits).toEqual([20000]);
    const down = async () => {
      throw new TypeError("fetch failed");
    };
    await expect(runOverpass("q", down, async () => undefined)).rejects.toThrow(ProviderFailureError);
  });

  it("raises a provider failure for other errors and after too many retries", async () => {
    await expect(runOverpass("q", async () => reply(400), async () => undefined)).rejects.toThrow(ProviderFailureError);
    await expect(runOverpass("q", async () => reply(504), async () => undefined)).rejects.toThrow(ProviderFailureError);
  });
});

describe("parseCountries", () => {
  const row = (iso: string, name: string, continent: string) => ({
    iso: { value: iso },
    cLabel: { value: name },
    contLabel: { value: continent },
  });

  it("builds one row per country, mapping continent labels", () => {
    const { countries, unresolved } = parseCountries([
      row("ES", "Spain", "Europe"),
      row("CL", "Chile", "South America"),
      row("NZ", "New Zealand", "Oceania"),
      row("KI", "Kiribati", "Insular Oceania"),
      row("KI", "Kiribati", "Oceania"),
    ]);
    expect(unresolved).toEqual([]);
    expect(countries.map((c) => `${c.code}:${c.continent}`)).toEqual([
      "cl:south-america",
      "es:europe",
      "ki:oceania",
      "nz:oceania",
    ]);
  });

  it("uses the override for transcontinental countries and reports unclear ones", () => {
    const { countries, unresolved } = parseCountries([
      row("TR", "Turkey", "Europe"),
      row("TR", "Turkey", "Asia"),
      row("XX", "Nowhere", "Europe"),
      row("XX", "Nowhere", "Asia"),
      row("YY", "Eurasia land", "Eurasia"),
      row("SU", "Soviet Union", "Europe"),
      row("GB-WLS", "Wales", "Europe"),
    ]);
    expect(countries).toEqual([{ code: "tr", name: "Turkey", continent: Continent.Asia }]);
    expect(unresolved).toEqual(["xx", "yy"]);
    expect(CONTINENT_OVERRIDES["ru"]).toBe(Continent.Europe);
  });
});

describe("buildWorld", () => {
  const pal = way(10, "Pal-Arinsal", box(1.45, 42.55, 1.5, 42.6));
  const deps = (votes: Map<string, number> | Error, data: Record<string, OsmElement[]>): WorldDeps => ({
    fetchElements: async (code) => {
      const elements = data[code];
      if (elements === undefined) {
        throw new ProviderFailureError(`no data for ${code}`);
      }
      return elements;
    },
    lookupVotes: async () => {
      if (votes instanceof Error) {
        throw votes;
      }
      return votes;
    },
  });

  it("keeps a border resort only in the majority country", async () => {
    const result = await buildWorld(["es", "ad"], deps(new Map([["ad", 9], ["es", 1]]), { es: [pal], ad: [pal] }));
    expect(result.resorts.map((r) => r.key)).toEqual(["ad-pal-arinsal"]);
    expect(result.skipped).toEqual([
      expect.objectContaining({ countryCode: "es", reason: "cross-border: most of it is in ad" }),
    ]);
  });

  it("lists a clearly shared resort in both countries", async () => {
    const result = await buildWorld(["es", "ad"], deps(new Map([["ad", 5], ["es", 5]]), { es: [pal], ad: [pal] }));
    expect(result.resorts.map((r) => r.key)).toEqual(["ad-pal-arinsal", "es-pal-arinsal"]);
  });

  it("leaves a border resort out, with a reason, when the country share cannot be determined", async () => {
    const failing = await buildWorld(["es", "ad"], deps(new ProviderFailureError("down"), { es: [pal], ad: [pal] }));
    expect(failing.resorts).toEqual([]);
    expect(failing.skipped.map((s) => s.reason)).toEqual(Array(2).fill("cross-border: country share could not be determined"));
    const empty = await buildWorld(["es", "ad"], deps(new Map(), { es: [pal], ad: [pal] }));
    expect(empty.resorts).toEqual([]);
  });

  it("does not touch resorts of a single country and reports countries that failed", async () => {
    const formigal = way(1, "Aramón Formigal", box(-0.44, 42.75, -0.36, 42.8));
    const result = await buildWorld(["es", "zz"], deps(new Map(), { es: [formigal] }));
    expect(result.resorts.map((r) => r.key)).toEqual(["es-aramon-formigal"]);
    expect(result.failedCountries).toEqual(["zz"]);
  });

  it("propagates unexpected errors instead of hiding them", async () => {
    const broken: WorldDeps = { fetchElements: async () => { throw new TypeError("bug"); }, lookupVotes: async () => new Map() };
    await expect(buildWorld(["es"], broken)).rejects.toThrow(TypeError);
    const lookupBug = deps(new TypeError("bug"), { es: [pal], ad: [pal] });
    await expect(buildWorld(["es", "ad"], lookupBug)).rejects.toThrow(TypeError);
  });
});
