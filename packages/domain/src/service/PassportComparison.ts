import { Passport } from "../model/Passport.js";

export interface PassportComparisonResult {
  readonly shared: readonly string[];
  readonly onlyFirst: readonly string[];
  readonly onlySecond: readonly string[];
}

/** Pure domain service: which resorts two users have in common and which only one has stamped. */
export function comparePassports(first: Passport, second: Passport): PassportComparisonResult {
  const firstKeys = first.stamps().map((s) => s.resort.value);
  const secondKeys = new Set(second.stamps().map((s) => s.resort.value));
  const firstSet = new Set(firstKeys);
  return {
    shared: firstKeys.filter((k) => secondKeys.has(k)).sort(),
    onlyFirst: firstKeys.filter((k) => !secondKeys.has(k)).sort(),
    onlySecond: [...secondKeys].filter((k) => !firstSet.has(k)).sort(),
  };
}
