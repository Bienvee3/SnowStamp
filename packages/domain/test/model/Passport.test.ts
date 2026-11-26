import { describe, expect, it } from "vitest";
import { DuplicateStampError, StampNotFoundError } from "../../src/exception/DomainError.js";
import { Passport } from "../../src/model/Passport.js";
import { ResortKey } from "../../src/valueobject/ResortKey.js";
import { VisitDate } from "../../src/valueobject/VisitDate.js";

const FORMIGAL = ResortKey.of("es-formigal");

describe("Passport", () => {
  it("stamps a resort with an optional date", () => {
    const passport = Passport.open("ana");
    passport.stamp(FORMIGAL, VisitDate.of("2025-02-01"));
    passport.stamp(ResortKey.of("ad-grandvalira"));

    expect(passport.hasStamp(FORMIGAL)).toBe(true);
    expect(passport.stamps().map((s) => s.visitedOn?.value ?? null)).toEqual(["2025-02-01", null]);
  });

  it("rejects stamping the same resort twice", () => {
    const passport = Passport.open("ana");
    passport.stamp(FORMIGAL);
    expect(() => passport.stamp(FORMIGAL)).toThrow(DuplicateStampError);
  });

  it("removes a stamp and rejects removing a missing one", () => {
    const passport = Passport.open("ana");
    passport.stamp(FORMIGAL);
    passport.unstamp(FORMIGAL);
    expect(passport.hasStamp(FORMIGAL)).toBe(false);
    expect(() => passport.unstamp(FORMIGAL)).toThrow(StampNotFoundError);
  });

  it("exposes an unmodifiable snapshot", () => {
    const passport = Passport.open("ana");
    passport.stamp(FORMIGAL);
    const snapshot = passport.stamps();

    expect(Object.isFrozen(snapshot)).toBe(true);
    passport.unstamp(FORMIGAL);
    expect(snapshot).toHaveLength(1);
    expect(passport.stamps()).toHaveLength(0);
  });

  it("is equal by owner", () => {
    expect(Passport.open("ana").equals(Passport.open("ana"))).toBe(true);
    expect(Passport.open("ana").equals(Passport.open("leo"))).toBe(false);
  });
});
