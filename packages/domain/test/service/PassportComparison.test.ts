import { describe, expect, it } from "vitest";
import { Passport } from "../../src/model/Passport.js";
import { comparePassports } from "../../src/service/PassportComparison.js";
import { ResortKey } from "../../src/valueobject/ResortKey.js";

function passportOf(owner: string, ...keys: string[]): Passport {
  const passport = Passport.open(owner);
  keys.forEach((k) => passport.stamp(ResortKey.of(k)));
  return passport;
}

describe("comparePassports", () => {
  it("splits resorts into shared and exclusive, sorted", () => {
    const ana = passportOf("ana", "es-formigal", "ad-grandvalira", "es-baqueira-beret");
    const leo = passportOf("leo", "es-formigal", "cl-portillo");

    expect(comparePassports(ana, leo)).toEqual({
      shared: ["es-formigal"],
      onlyFirst: ["ad-grandvalira", "es-baqueira-beret"],
      onlySecond: ["cl-portillo"],
    });
  });

  it("is empty for two empty passports", () => {
    expect(comparePassports(Passport.open("a"), Passport.open("b"))).toEqual({
      shared: [],
      onlyFirst: [],
      onlySecond: [],
    });
  });
});
