// Usage: npm run extract -w @snowstamp/pipeline -- [--refresh] [ISO2 ...]
// With no country codes it covers every country in the world (Wikidata list). Raw Overpass answers are
// cached in data/out/raw/ so an interrupted run resumes; --refresh downloads them again.
// Writes data/out/world.seed.sql, world.resorts.json, world.skipped.json (ignored by git; ODbL data).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Coordinate, ProviderFailureError } from "@snowstamp/domain";
import { COUNTRIES_SPARQL, parseCountries, type WikidataBinding } from "./countries.js";
import { OSM_ATTRIBUTION, buildCountryQuery, type OsmElement } from "./osm.js";
import { lookupCountryVotes, runOverpass } from "./overpass.js";
import { seedSql } from "./sql.js";
import { buildWorld } from "./world.js";

const PAUSE_BETWEEN_COUNTRIES_MS = 3000;
const args = process.argv.slice(2);
const refresh = args.includes("--refresh");
const requested = args.filter((a) => !a.startsWith("--")).map((a) => a.toLowerCase());

const outDir = new URL("../../../data/out/", import.meta.url);
const rawDir = new URL("raw/", outDir);
await mkdir(rawDir, { recursive: true });

const wikidata = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(COUNTRIES_SPARQL)}`, {
  headers: { "User-Agent": "SnowStampPipeline/0.1 (resort data curation)", Accept: "application/sparql-results+json" },
});
if (!wikidata.ok) {
  throw new ProviderFailureError(`Wikidata answered ${wikidata.status}`);
}
const { countries, unresolved } = parseCountries(
  ((await wikidata.json()) as { results: { bindings: WikidataBinding[] } }).results.bindings,
);
if (unresolved.length > 0) {
  console.warn(`Continent unclear, add to CONTINENT_OVERRIDES: ${unresolved.join(", ")}`);
}
const codes = requested.length > 0 ? requested : countries.map((c) => c.code);

async function fetchElements(code: string): Promise<readonly OsmElement[]> {
  const file = new URL(`${code}.json`, rawDir);
  if (!refresh) {
    try {
      return JSON.parse(await readFile(file, "utf8")) as OsmElement[];
    } catch {
      // not cached yet
    }
  }
  await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_COUNTRIES_MS));
  let elements: readonly OsmElement[];
  try {
    elements = await runOverpass(buildCountryQuery(code));
  } catch (error) {
    console.error(`${code}: ${(error as Error).message}`);
    throw error;
  }
  await writeFile(file, JSON.stringify(elements));
  console.log(`${code}: ${elements.length} elements`);
  return elements;
}

const world = await buildWorld(codes, {
  fetchElements,
  lookupVotes: (points: readonly Coordinate[]) => lookupCountryVotes(points),
});

await writeFile(new URL("world.seed.sql", outDir), seedSql(world.resorts, countries));
await writeFile(
  new URL("world.resorts.json", outDir),
  JSON.stringify({ attribution: OSM_ATTRIBUTION, resorts: world.resorts.map(({ polygons: _p, ...r }) => r) }, null, 2),
);
await writeFile(new URL("world.skipped.json", outDir), JSON.stringify(world.skipped, null, 2));
console.log(
  `${world.resorts.length} resorts, ${world.skipped.length} skipped, failed countries: ${world.failedCountries.join(", ") || "none"}`,
);
