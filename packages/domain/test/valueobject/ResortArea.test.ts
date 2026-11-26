import { describe, expect, it } from "vitest";
import { InvalidGeometryError } from "../../src/exception/DomainError.js";
import { ResortArea } from "../../src/valueobject/ResortArea.js";
import { at, rectangle } from "../fixtures.js";

describe("ResortArea construction", () => {
  it("rejects an empty multipolygon", () => {
    expect(() => ResortArea.of([])).toThrow(InvalidGeometryError);
  });

  it("rejects a ring with fewer than 4 coordinates", () => {
    expect(() => ResortArea.of([{ outer: [at(0, 0), at(1, 0), at(0, 0)], holes: [] }])).toThrow(
      InvalidGeometryError,
    );
  });

  it("rejects an unclosed outer ring", () => {
    const open = [at(0, 0), at(1, 0), at(1, 1), at(0, 1)];
    expect(() => ResortArea.of([{ outer: open, holes: [] }])).toThrow(InvalidGeometryError);
  });

  it("rejects an unclosed hole", () => {
    const open = [at(0.2, 0.2), at(0.4, 0.2), at(0.4, 0.4), at(0.2, 0.4)];
    expect(() => ResortArea.of([{ outer: rectangle(0, 0, 1, 1), holes: [open] }])).toThrow(
      InvalidGeometryError,
    );
  });

  it("is not affected by later mutation of the input arrays", () => {
    const outer = rectangle(0, 0, 1, 1);
    const area = ResortArea.of([{ outer, holes: [] }]);
    outer.length = 0;
    expect(area.contains(at(0.5, 0.5))).toBe(true);
  });
});

describe("ResortArea.contains", () => {
  const square = ResortArea.of([{ outer: rectangle(0, 0, 10, 10), holes: [] }]);

  it("is true inside and false outside", () => {
    expect(square.contains(at(5, 5))).toBe(true);
    expect(square.contains(at(11, 5))).toBe(false);
    expect(square.contains(at(5, -0.0001))).toBe(false);
  });

  it("counts points on an edge and on a vertex as inside", () => {
    expect(square.contains(at(5, 0))).toBe(true);
    expect(square.contains(at(10, 5))).toBe(true);
    expect(square.contains(at(10, 10))).toBe(true);
  });

  it("treats a collinear point beyond a segment as outside", () => {
    expect(square.contains(at(15, 0))).toBe(false);
  });

  it("excludes holes but keeps the hole edge inside", () => {
    const withHole = ResortArea.of([{ outer: rectangle(0, 0, 10, 10), holes: [rectangle(4, 4, 6, 6)] }]);
    expect(withHole.contains(at(5, 5))).toBe(false);
    expect(withHole.contains(at(4, 5))).toBe(true);
    expect(withHole.contains(at(2, 2))).toBe(true);
  });

  it("supports several polygons and concave shapes", () => {
    const lShape = [at(0, 0), at(10, 0), at(10, 4), at(4, 4), at(4, 10), at(0, 10), at(0, 0)];
    const area = ResortArea.of([
      { outer: lShape, holes: [] },
      { outer: rectangle(20, 20, 30, 30), holes: [] },
    ]);
    expect(area.contains(at(2, 8))).toBe(true);
    expect(area.contains(at(8, 8))).toBe(false);
    expect(area.contains(at(25, 25))).toBe(true);
  });
});

describe("ResortArea.areaSquareKm", () => {
  it("is about 12,364 km2 for one degree at the equator", () => {
    const area = ResortArea.of([{ outer: rectangle(0, 0, 1, 1), holes: [] }]);
    expect(area.areaSquareKm()).toBeGreaterThan(12300);
    expect(area.areaSquareKm()).toBeLessThan(12430);
  });

  it("shrinks with latitude", () => {
    const equator = ResortArea.of([{ outer: rectangle(0, 0, 1, 1), holes: [] }]);
    const north = ResortArea.of([{ outer: rectangle(0, 60, 1, 61), holes: [] }]);
    expect(north.areaSquareKm() / equator.areaSquareKm()).toBeCloseTo(0.5, 1);
  });

  it("subtracts holes and adds polygons", () => {
    const solid = ResortArea.of([{ outer: rectangle(0, 0, 0.1, 0.1), holes: [] }]);
    const holed = ResortArea.of([{ outer: rectangle(0, 0, 0.1, 0.1), holes: [rectangle(0.02, 0.02, 0.05, 0.05)] }]);
    const double = ResortArea.of([
      { outer: rectangle(0, 0, 0.1, 0.1), holes: [] },
      { outer: rectangle(1, 1, 1.1, 1.1), holes: [] },
    ]);
    expect(holed.areaSquareKm()).toBeLessThan(solid.areaSquareKm());
    expect(double.areaSquareKm()).toBeGreaterThan(solid.areaSquareKm() * 1.9);
  });
});
