import { describe, expect, it } from "vitest";
import { MIN_RESORT_AREA_SQUARE_KM, isResortSized } from "../../src/service/ResortEligibility.js";
import { ResortArea } from "../../src/valueobject/ResortArea.js";
import { FORMIGAL_AREA, rectangle } from "../fixtures.js";

describe("isResortSized", () => {
  it("accepts a large domain and rejects a tiny one", () => {
    expect(isResortSized(FORMIGAL_AREA)).toBe(true);
    const tinyLift = ResortArea.of([{ outer: rectangle(0, 42, 0.001, 42.001), holes: [] }]);
    expect(isResortSized(tinyLift)).toBe(false);
  });

  it("uses a configurable threshold, inclusive at the boundary", () => {
    const area = FORMIGAL_AREA.areaSquareKm();
    expect(isResortSized(FORMIGAL_AREA, area)).toBe(true);
    expect(isResortSized(FORMIGAL_AREA, area + 1)).toBe(false);
    expect(MIN_RESORT_AREA_SQUARE_KM).toBeGreaterThan(0);
  });
});
