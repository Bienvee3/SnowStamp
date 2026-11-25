import { describe, expect, it } from "vitest";
import { InvalidResortError } from "../../src/exception/DomainError.js";
import { Country, Continent } from "../../src/model/Country.js";
import { Resort } from "../../src/model/Resort.js";
import { CountryCode } from "../../src/valueobject/CountryCode.js";
import { ResortKey } from "../../src/valueobject/ResortKey.js";
import { FORMIGAL, FORMIGAL_AREA, at } from "../fixtures.js";

describe("Resort", () => {
  it("derives the country from its key and delegates containment to its area", () => {
    expect(FORMIGAL.countryCode).toBe("es");
    expect(FORMIGAL.contains(at(-0.38, 42.78))).toBe(true);
    expect(FORMIGAL.contains(at(-0.38, 42.7))).toBe(false);
  });

  it("trims the name and rejects a blank one", () => {
    expect(Resort.create(ResortKey.of("es-x"), "  Formigal ", FORMIGAL_AREA).name).toBe("Formigal");
    expect(() => Resort.create(ResortKey.of("es-x"), "   ", FORMIGAL_AREA)).toThrow(InvalidResortError);
  });

  it("is equal by business key, not by name", () => {
    const other = Resort.create(ResortKey.of("es-formigal"), "Other name", FORMIGAL_AREA);
    expect(FORMIGAL.equals(other)).toBe(true);
  });
});

describe("Country", () => {
  it("is equal by code", () => {
    const code = CountryCode.of("es");
    expect(Country.of(code, Continent.Europe).equals(Country.of(code, Continent.Asia))).toBe(true);
    expect(Country.of(code, Continent.Europe).equals(Country.of(CountryCode.of("ad"), Continent.Europe))).toBe(
      false,
    );
  });
});
