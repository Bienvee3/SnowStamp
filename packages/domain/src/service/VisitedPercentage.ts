import { UnknownResortError } from "../exception/DomainError.js";
import { Continent, Country } from "../model/Country.js";
import { Resort } from "../model/Resort.js";
import { ResortKey } from "../valueobject/ResortKey.js";

export interface Progress {
  readonly visited: number;
  readonly total: number;
  /** visited / total * 100, between 0 and 100. */
  readonly percentage: number;
}

export interface VisitedProgress {
  readonly world: Progress;
  readonly byCountry: ReadonlyMap<string, Progress>;
  readonly byContinent: ReadonlyMap<Continent, Progress>;
}

function toProgress(visited: number, total: number): Progress {
  return { visited, total, percentage: (visited / total) * 100 };
}

/**
 * Pure domain service: visited percentage per country, continent and world.
 * Countries without resorts are omitted (no denominator). A visited key that is not in the catalog,
 * or a resort whose country is not in the country list, is an error: percentages must never be guessed.
 */
export function calculateVisitedProgress(
  resorts: readonly Resort[],
  countries: readonly Country[],
  visited: readonly ResortKey[],
): VisitedProgress {
  const continentOf = new Map(countries.map((c) => [c.code.value, c.continent]));
  const catalog = new Set(resorts.map((r) => r.key.value));

  for (const key of visited) {
    if (!catalog.has(key.value)) {
      throw new UnknownResortError(`Visited resort not in catalog: ${key.value}`);
    }
  }
  const visitedSet = new Set(visited.map((k) => k.value));

  const totalByCountry = new Map<string, number>();
  const visitedByCountry = new Map<string, number>();
  for (const resort of resorts) {
    if (!continentOf.has(resort.countryCode)) {
      throw new UnknownResortError(`Resort ${resort.key.value} has unknown country ${resort.countryCode}`);
    }
    totalByCountry.set(resort.countryCode, (totalByCountry.get(resort.countryCode) ?? 0) + 1);
    if (visitedSet.has(resort.key.value)) {
      visitedByCountry.set(resort.countryCode, (visitedByCountry.get(resort.countryCode) ?? 0) + 1);
    }
  }

  const byCountry = new Map<string, Progress>();
  const totalByContinent = new Map<Continent, number>();
  const visitedByContinent = new Map<Continent, number>();
  for (const [code, total] of totalByCountry) {
    const visitedCount = visitedByCountry.get(code) ?? 0;
    byCountry.set(code, toProgress(visitedCount, total));
    const continent = continentOf.get(code) as Continent;
    totalByContinent.set(continent, (totalByContinent.get(continent) ?? 0) + total);
    visitedByContinent.set(continent, (visitedByContinent.get(continent) ?? 0) + visitedCount);
  }

  const byContinent = new Map<Continent, Progress>();
  for (const [continent, total] of totalByContinent) {
    byContinent.set(continent, toProgress(visitedByContinent.get(continent) ?? 0, total));
  }

  const worldTotal = resorts.length;
  return {
    world: worldTotal === 0 ? { visited: 0, total: 0, percentage: 0 } : toProgress(visitedSet.size, worldTotal),
    byCountry,
    byContinent,
  };
}
