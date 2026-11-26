import { describe, expect, it } from "vitest";
import { UnknownResortError } from "../../src/exception/DomainError.js";
import { Continent } from "../../src/model/Country.js";
import { calculateVisitedProgress } from "../../src/service/VisitedPercentage.js";
import { ResortKey } from "../../src/valueobject/ResortKey.js";
import { ANDORRA, BAQUEIRA, CHILE, FORMIGAL, GRANDVALIRA, PORTILLO, SPAIN } from "../fixtures.js";

const RESORTS = [FORMIGAL, BAQUEIRA, GRANDVALIRA, PORTILLO];
const COUNTRIES = [SPAIN, ANDORRA, CHILE];

describe("calculateVisitedProgress", () => {
  it("computes percentages per country, continent and world", () => {
    const result = calculateVisitedProgress(RESORTS, COUNTRIES, [FORMIGAL.key, GRANDVALIRA.key]);

    expect(result.byCountry.get("es")).toEqual({ visited: 1, total: 2, percentage: 50 });
    expect(result.byCountry.get("ad")).toEqual({ visited: 1, total: 1, percentage: 100 });
    expect(result.byCountry.get("cl")).toEqual({ visited: 0, total: 1, percentage: 0 });
    expect(result.byContinent.get(Continent.Europe)).toMatchObject({ visited: 2, total: 3 });
    expect(result.byContinent.get(Continent.SouthAmerica)).toEqual({ visited: 0, total: 1, percentage: 0 });
    expect(result.world).toEqual({ visited: 2, total: 4, percentage: 50 });
  });

  it("returns zero progress when nothing is visited", () => {
    expect(calculateVisitedProgress(RESORTS, COUNTRIES, []).world.percentage).toBe(0);
  });

  it("returns 100% when every resort is visited", () => {
    const all = RESORTS.map((r) => r.key);
    expect(calculateVisitedProgress(RESORTS, COUNTRIES, all).world.percentage).toBe(100);
  });

  it("omits countries and continents without resorts", () => {
    const result = calculateVisitedProgress([FORMIGAL], COUNTRIES, []);
    expect([...result.byCountry.keys()]).toEqual(["es"]);
    expect(result.byContinent.has(Continent.SouthAmerica)).toBe(false);
  });

  it("handles an empty catalog without dividing by zero", () => {
    expect(calculateVisitedProgress([], COUNTRIES, []).world).toEqual({ visited: 0, total: 0, percentage: 0 });
  });

  it("counts a duplicated visited key once", () => {
    const result = calculateVisitedProgress(RESORTS, COUNTRIES, [FORMIGAL.key, FORMIGAL.key]);
    expect(result.world.visited).toBe(1);
  });

  it("fails fast on a visited resort that is not in the catalog", () => {
    expect(() => calculateVisitedProgress(RESORTS, COUNTRIES, [ResortKey.of("fr-chamonix")])).toThrow(
      UnknownResortError,
    );
  });

  it("fails fast on a resort whose country is not listed", () => {
    expect(() => calculateVisitedProgress(RESORTS, [SPAIN, ANDORRA], [])).toThrow(UnknownResortError);
  });
});
