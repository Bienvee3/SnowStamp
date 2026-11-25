// Usage: npm run extract -w @snowstamp/pipeline -- <ISO2 country code> [min area km2]
// Writes data/out/<cc>.candidates.json, <cc>.skipped.json and <cc>.seed.sql (ignored by git; ODbL data).
import { mkdir, writeFile } from "node:fs/promises";
import { extractCandidates } from "./candidates.js";
import { OSM_ATTRIBUTION, buildCountryQuery, type OsmElement } from "./osm.js";
import { seedSql } from "./sql.js";

const [country, minArea] = process.argv.slice(2);
if (country === undefined) {
  console.error("Usage: extract <ISO2 country code> [min area km2]");
  process.exit(1);
}

async function query(): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "User-Agent": "SnowStampPipeline/0.1 (resort data curation)", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: buildCountryQuery(country as string) }),
    });
    const retryable = response.status === 429 || response.status === 504;
    if (response.ok || !retryable || attempt === 6) {
      return response;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 20000));
  }
}

const response = await query();
if (!response.ok) {
  throw new Error(`Overpass answered ${response.status}: ${await response.text()}`);
}
const { elements } = (await response.json()) as { elements: OsmElement[] };
const result = extractCandidates(elements, country, minArea === undefined ? undefined : Number(minArea));

const outDir = new URL("../../../data/out/", import.meta.url);
await mkdir(outDir, { recursive: true });
const cc = country.toLowerCase();
await writeFile(
  new URL(`${cc}.candidates.json`, outDir),
  JSON.stringify({ attribution: OSM_ATTRIBUTION, candidates: result.candidates.map(({ polygons: _p, ...c }) => c) }, null, 2),
);
await writeFile(new URL(`${cc}.skipped.json`, outDir), JSON.stringify(result.skipped, null, 2));
await writeFile(new URL(`${cc}.seed.sql`, outDir), seedSql(result.candidates));
console.log(`${cc}: ${result.candidates.length} candidates, ${result.skipped.length} skipped (of ${elements.length} elements)`);
