import { Continent, Country } from "../src/model/Country.js";
import { Resort } from "../src/model/Resort.js";
import { Coordinate } from "../src/valueobject/Coordinate.js";
import { CountryCode } from "../src/valueobject/CountryCode.js";
import { ResortArea } from "../src/valueobject/ResortArea.js";
import { ResortKey } from "../src/valueobject/ResortKey.js";

export const at = (longitude: number, latitude: number): Coordinate => Coordinate.of(longitude, latitude);

/** Closed rectangular ring from two opposite corners. */
export function rectangle(west: number, south: number, east: number, north: number): Coordinate[] {
  return [at(west, south), at(east, south), at(east, north), at(west, north), at(west, south)];
}

/**
 * ILLUSTRATIVE polygons: simplified shapes placed near the real resorts to exercise the rules.
 * They are NOT the real skiable domains; real polygons come from the curated OSM pipeline.
 */
export const FORMIGAL_AREA = ResortArea.of([{ outer: rectangle(-0.42, 42.76, -0.34, 42.8), holes: [] }]);
export const BAQUEIRA_AREA = ResortArea.of([
  { outer: rectangle(0.9, 42.68, 0.98, 42.72), holes: [] },
  { outer: rectangle(1.0, 42.7, 1.04, 42.73), holes: [] },
]);

export const FORMIGAL = Resort.create(ResortKey.of("es-formigal"), "Formigal", FORMIGAL_AREA);
export const BAQUEIRA = Resort.create(ResortKey.of("es-baqueira-beret"), "Baqueira Beret", BAQUEIRA_AREA);
export const GRANDVALIRA = Resort.create(
  ResortKey.of("ad-grandvalira"),
  "Grandvalira",
  ResortArea.of([{ outer: rectangle(1.6, 42.52, 1.74, 42.58), holes: [] }]),
);
export const PORTILLO = Resort.create(
  ResortKey.of("cl-portillo"),
  "Portillo",
  ResortArea.of([{ outer: rectangle(-70.15, -32.87, -70.1, -32.82), holes: [] }]),
);

export const SPAIN = Country.of(CountryCode.of("es"), Continent.Europe);
export const ANDORRA = Country.of(CountryCode.of("ad"), Continent.Europe);
export const CHILE = Country.of(CountryCode.of("cl"), Continent.SouthAmerica);
