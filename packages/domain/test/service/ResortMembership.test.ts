import { describe, expect, it } from "vitest";
import { resortsContaining } from "../../src/service/ResortMembership.js";
import { BAQUEIRA, FORMIGAL, GRANDVALIRA, at } from "../fixtures.js";

const ALL = [FORMIGAL, BAQUEIRA, GRANDVALIRA];

describe("resortsContaining (illustrative polygons near Formigal and Baqueira)", () => {
  it("finds the resort for a point on a piste", () => {
    expect(resortsContaining(at(-0.38, 42.78), ALL)).toEqual([FORMIGAL]);
    expect(resortsContaining(at(0.94, 42.7), ALL)).toEqual([BAQUEIRA]);
  });

  it("finds a resort through its second polygon", () => {
    expect(resortsContaining(at(1.0, 42.72), ALL)).toEqual([BAQUEIRA]);
  });

  it("does not match a base car park outside the skiable domain", () => {
    expect(resortsContaining(at(-0.372, 42.755), ALL)).toEqual([]);
  });

  it("does not match an access road outside the skiable domain", () => {
    expect(resortsContaining(at(-0.36, 42.74), ALL)).toEqual([]);
  });

  it("matches a point exactly on the domain edge", () => {
    expect(resortsContaining(at(-0.38, 42.76), ALL)).toEqual([FORMIGAL]);
  });

  it("returns nothing far from every resort", () => {
    expect(resortsContaining(at(-3.7, 40.4), ALL)).toEqual([]);
  });
});
