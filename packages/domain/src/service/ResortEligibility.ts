import { ResortArea } from "../valueobject/ResortArea.js";

/**
 * Minimum skiable-domain area for something to count as a resort (and be part of any percentage).
 * Provisional value chosen to exclude tiny local lifts; the owner can tune it (see docs/CURRENT_STATUS.md).
 */
export const MIN_RESORT_AREA_SQUARE_KM = 0.3;

/** Pure domain service: whether a skiable domain is large enough to count as a resort. */
export function isResortSized(area: ResortArea, minSquareKm: number = MIN_RESORT_AREA_SQUARE_KM): boolean {
  return area.areaSquareKm() >= minSquareKm;
}
