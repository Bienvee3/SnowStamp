import { describe, expect, it } from "vitest";
import {
  InvalidCoordinateError,
  InvalidCountryCodeError,
  InvalidResortKeyError,
  InvalidVisitDateError,
} from "../../src/exception/DomainError.js";
import { Coordinate } from "../../src/valueobject/Coordinate.js";
import { CountryCode } from "../../src/valueobject/CountryCode.js";
import { ResortKey } from "../../src/valueobject/ResortKey.js";
import { VisitDate } from "../../src/valueobject/VisitDate.js";

describe("Coordinate", () => {
  it("accepts the extreme valid values", () => {
    expect(Coordinate.of(-180, -90).latitude).toBe(-90);
    expect(Coordinate.of(180, 90).longitude).toBe(180);
  });

  it.each([
    [180.0001, 0],
    [-180.0001, 0],
    [0, 90.0001],
    [0, -90.0001],
    [Number.NaN, 0],
    [0, Number.POSITIVE_INFINITY],
  ])("rejects (%s, %s)", (lon, lat) => {
    expect(() => Coordinate.of(lon, lat)).toThrow(InvalidCoordinateError);
  });

  it("compares by value", () => {
    expect(Coordinate.of(1, 2).equals(Coordinate.of(1, 2))).toBe(true);
    expect(Coordinate.of(1, 2).equals(Coordinate.of(2, 1))).toBe(false);
  });
});

describe("ResortKey", () => {
  it("accepts country code plus slug and exposes the country", () => {
    const key = ResortKey.of("es-baqueira-beret");
    expect(key.countryCode).toBe("es");
    expect(key.equals(ResortKey.of("es-baqueira-beret"))).toBe(true);
    expect(key.equals(ResortKey.of("es-formigal"))).toBe(false);
  });

  it.each(["", "formigal", "ES-formigal", "es-", "es--x", "es-Formigal", "esp-formigal"])(
    "rejects %j",
    (value) => {
      expect(() => ResortKey.of(value)).toThrow(InvalidResortKeyError);
    },
  );
});

describe("CountryCode", () => {
  it("accepts two lowercase letters", () => {
    expect(CountryCode.of("es").equals(CountryCode.of("es"))).toBe(true);
    expect(CountryCode.of("es").equals(CountryCode.of("ad"))).toBe(false);
  });

  it.each(["", "E", "ES", "esp", "e1"])("rejects %j", (value) => {
    expect(() => CountryCode.of(value)).toThrow(InvalidCountryCodeError);
  });
});

describe("VisitDate", () => {
  it("accepts real dates including leap day", () => {
    expect(VisitDate.of("2024-02-29").value).toBe("2024-02-29");
    expect(VisitDate.of("2025-01-05").equals(VisitDate.of("2025-01-05"))).toBe(true);
    expect(VisitDate.of("2025-01-05").equals(VisitDate.of("2025-01-06"))).toBe(false);
  });

  it.each(["2025-02-29", "2025-13-01", "2025-00-10", "2025-1-5", "05/01/2025", ""])(
    "rejects %j",
    (value) => {
      expect(() => VisitDate.of(value)).toThrow(InvalidVisitDateError);
    },
  );
});
