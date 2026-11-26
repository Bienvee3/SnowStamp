import { Continent } from "@snowstamp/domain";

export interface CountryRow {
  readonly code: string;
  readonly name: string;
  readonly continent: Continent;
}

/** Wikidata: every country with an ISO 3166-1 alpha-2 code, its English name and its continent(s). */
export const COUNTRIES_SPARQL =
  'SELECT ?iso ?cLabel ?contLabel WHERE { ?c wdt:P297 ?iso . ?c wdt:P30 ?cont . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }';

const CONTINENT_BY_LABEL: Readonly<Record<string, Continent>> = {
  Africa: Continent.Africa,
  Antarctica: Continent.Antarctica,
  Asia: Continent.Asia,
  Europe: Continent.Europe,
  "North America": Continent.NorthAmerica,
  Oceania: Continent.Oceania,
  "Insular Oceania": Continent.Oceania,
  "South America": Continent.SouthAmerica,
};

/** Countries Wikidata places on several continents; these choices are for the owner to review. */
export const CONTINENT_OVERRIDES: Readonly<Record<string, Continent>> = {
  tr: Continent.Asia,
  kz: Continent.Asia,
  ru: Continent.Europe,
  cy: Continent.Europe,
  tf: Continent.Antarctica,
  um: Continent.Oceania,
};

/** Obsolete codes that Wikidata still lists; codes that are not two letters (such as GB-WLS) are dropped too. */
const EXCLUDED_CODES: ReadonlySet<string> = new Set(["su"]);

export interface WikidataBinding {
  readonly iso: { readonly value: string };
  readonly cLabel: { readonly value: string };
  readonly contLabel: { readonly value: string };
}

/** Groups Wikidata rows into one row per country. Countries whose continent is unclear are returned apart. */
export function parseCountries(bindings: readonly WikidataBinding[]): { countries: CountryRow[]; unresolved: string[] } {
  const grouped = new Map<string, { name: string; continents: Set<Continent> }>();
  for (const b of bindings) {
    const code = b.iso.value.toLowerCase();
    if (!/^[a-z]{2}$/.test(code) || EXCLUDED_CODES.has(code)) {
      continue;
    }
    const entry = grouped.get(code) ?? { name: b.cLabel.value, continents: new Set<Continent>() };
    const continent = CONTINENT_BY_LABEL[b.contLabel.value];
    if (continent !== undefined) {
      entry.continents.add(continent);
    }
    grouped.set(code, entry);
  }
  const countries: CountryRow[] = [];
  const unresolved: string[] = [];
  for (const [code, { name, continents }] of [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const continent = CONTINENT_OVERRIDES[code] ?? (continents.size === 1 ? [...continents][0] : undefined);
    if (continent === undefined) {
      unresolved.push(code);
    } else {
      countries.push({ code, name, continent });
    }
  }
  return { countries, unresolved };
}
