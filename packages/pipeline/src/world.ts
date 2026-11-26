import { ProviderFailureError, type Coordinate } from "@snowstamp/domain";
import { CountryUndeterminedError, decideCountries, samplePoints } from "./borders.js";
import { extractCandidates, type Candidate, type Skipped } from "./candidates.js";
import type { OsmElement } from "./osm.js";

export interface WorldDeps {
  fetchElements(countryCode: string): Promise<readonly OsmElement[]>;
  /** Votes per country (lowercase ISO) for sample points inside a resort. */
  lookupVotes(points: readonly Coordinate[]): Promise<ReadonlyMap<string, number>>;
}

export interface WorldSkipped extends Skipped {
  readonly countryCode: string;
}

export interface WorldResult {
  readonly resorts: readonly Candidate[];
  readonly skipped: readonly WorldSkipped[];
  /** Countries whose OSM data could not be fetched; run again to retry them. */
  readonly failedCountries: readonly string[];
}

/** Groups candidates that share an OSM element: the same resort found from several countries. */
function groupByCommonElement(candidates: readonly Candidate[]): Candidate[][] {
  const parent = candidates.map((_, i) => i);
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) {
      root = parent[root] as number;
    }
    return root;
  };
  const owner = new Map<string, number>();
  candidates.forEach((candidate, i) => {
    for (const ref of candidate.osmRefs) {
      const other = owner.get(ref);
      if (other === undefined) {
        owner.set(ref, i);
      } else {
        parent[find(i)] = find(other);
      }
    }
  });
  const groups = new Map<number, Candidate[]>();
  candidates.forEach((candidate, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), candidate]);
  });
  return [...groups.values()];
}

/**
 * Builds the world catalogue: extracts every country, then settles resorts found from several countries
 * (a border-crossing resort): it stays in the country with most of it, plus any other country holding a
 * clearly sizeable part. Failures never produce guessed data: the resort is skipped with the reason.
 */
export async function buildWorld(countryCodes: readonly string[], deps: WorldDeps): Promise<WorldResult> {
  const found: Candidate[] = [];
  const skipped: WorldSkipped[] = [];
  const failedCountries: string[] = [];

  for (const code of countryCodes) {
    try {
      const result = extractCandidates(await deps.fetchElements(code), code);
      found.push(...result.candidates);
      skipped.push(...result.skipped.map((s) => ({ ...s, countryCode: code })));
    } catch (error) {
      if (!(error instanceof ProviderFailureError)) {
        throw error;
      }
      failedCountries.push(code);
    }
  }

  const resorts: Candidate[] = [];
  for (const group of groupByCommonElement(found)) {
    if (new Set(group.map((c) => c.countryCode)).size === 1) {
      resorts.push(...group);
      continue;
    }
    const widest = group.reduce((best, c) => (c.areaSquareKm > best.areaSquareKm ? c : best));
    let keep: string[];
    try {
      keep = decideCountries(await deps.lookupVotes(samplePoints(widest.polygons)));
    } catch (error) {
      if (!(error instanceof ProviderFailureError) && !(error instanceof CountryUndeterminedError)) {
        throw error;
      }
      skipped.push(
        ...group.map((c) => ({
          osmRef: c.osmRef,
          name: c.name,
          countryCode: c.countryCode,
          reason: "cross-border: country share could not be determined",
        })),
      );
      continue;
    }
    for (const candidate of group) {
      if (keep.includes(candidate.countryCode)) {
        resorts.push(candidate);
      } else {
        skipped.push({
          osmRef: candidate.osmRef,
          name: candidate.name,
          countryCode: candidate.countryCode,
          reason: `cross-border: most of it is in ${keep[0]}`,
        });
      }
    }
  }
  return { resorts: resorts.sort((a, b) => a.key.localeCompare(b.key)), skipped, failedCountries };
}
