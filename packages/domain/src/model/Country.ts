import { CountryCode } from "../valueobject/CountryCode.js";

export enum Continent {
  Africa = "africa",
  Antarctica = "antarctica",
  Asia = "asia",
  Europe = "europe",
  NorthAmerica = "north-america",
  Oceania = "oceania",
  SouthAmerica = "south-america",
}

/** Reference data: a country and the continent it belongs to. Equality is on the code. */
export class Country {
  private constructor(
    readonly code: CountryCode,
    readonly continent: Continent,
  ) {}

  static of(code: CountryCode, continent: Continent): Country {
    return new Country(code, continent);
  }

  equals(other: Country): boolean {
    return this.code.equals(other.code);
  }
}
