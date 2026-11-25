import { Resort } from "../model/Resort.js";
import { Coordinate } from "../valueobject/Coordinate.js";

/** Pure domain service: which resorts contain a GPS position (inside the skiable domain). */
export function resortsContaining(point: Coordinate, resorts: readonly Resort[]): readonly Resort[] {
  return resorts.filter((resort) => resort.contains(point));
}
