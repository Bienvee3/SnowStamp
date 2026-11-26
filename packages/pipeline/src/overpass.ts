import { Coordinate, ProviderFailureError } from "@snowstamp/domain";
import type { OsmElement } from "./osm.js";

const ENDPOINT = "https://overpass-api.de/api/interpreter";
const MAX_ATTEMPTS = 6;
const RETRY_STATUSES = new Set([429, 502, 503, 504]);
const RETRY_STEP_MS = 20000;

export type Fetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; text(): Promise<string>; json(): Promise<unknown> }>;
export type Sleep = (ms: number) => Promise<void>;

/** Runs an Overpass query, retrying when the public server is rate limited or times out. */
export async function runOverpass(
  query: string,
  fetchImpl: Fetch = fetch as unknown as Fetch,
  sleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<readonly OsmElement[]> {
  for (let attempt = 1; ; attempt++) {
    let response: Awaited<ReturnType<Fetch>>;
    try {
      response = await fetchImpl(ENDPOINT, {
        method: "POST",
        headers: { "User-Agent": "SnowStampPipeline/0.1 (resort data curation)", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }).toString(),
      });
    } catch (error) {
      // Network failure (dropped connection, DNS): retried like a busy server, then reported as a provider failure.
      if (attempt === MAX_ATTEMPTS) {
        throw new ProviderFailureError(`Overpass unreachable: ${(error as Error).message}`);
      }
      await sleep(attempt * RETRY_STEP_MS);
      continue;
    }
    if (response.ok) {
      return ((await response.json()) as { elements: OsmElement[] }).elements;
    }
    if (!RETRY_STATUSES.has(response.status) || attempt === MAX_ATTEMPTS) {
      throw new ProviderFailureError(`Overpass answered ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }
    await sleep(attempt * RETRY_STEP_MS);
  }
}

/** One statement per point: the country areas (ISO 3166-1, admin level 2) containing it. */
export function buildCountryOfPointsQuery(points: readonly Coordinate[]): string {
  const statements = points.map(
    (p, i) =>
      `is_in(${p.latitude},${p.longitude})->.a${i};` +
      `area.a${i}["admin_level"="2"]["ISO3166-1"];` +
      `convert vote ::id=id(),iso=t["ISO3166-1"],i="${i}";out;`,
  );
  return `[out:json][timeout:120];${statements.join("")}`;
}

/** Votes per country (lowercase ISO code) from the answer to {@link buildCountryOfPointsQuery}. */
export function countVotes(elements: readonly OsmElement[]): Map<string, number> {
  const votes = new Map<string, number>();
  for (const element of elements) {
    const iso = element.tags?.["iso"]?.toLowerCase();
    if (iso !== undefined) {
      votes.set(iso, (votes.get(iso) ?? 0) + 1);
    }
  }
  return votes;
}

export async function lookupCountryVotes(
  points: readonly Coordinate[],
  run: (query: string) => Promise<readonly OsmElement[]> = runOverpass,
): Promise<Map<string, number>> {
  return countVotes(await run(buildCountryOfPointsQuery(points)));
}
