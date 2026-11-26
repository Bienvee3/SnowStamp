import { InvalidCoordinateError } from "../exception/DomainError.js";

export const MIN_LONGITUDE = -180;
export const MAX_LONGITUDE = 180;
export const MIN_LATITUDE = -90;
export const MAX_LATITUDE = 90;

/** A WGS84 position. Longitude is x, latitude is y. */
export class Coordinate {
  private constructor(
    readonly longitude: number,
    readonly latitude: number,
  ) {}

  static of(longitude: number, latitude: number): Coordinate {
    if (!Number.isFinite(longitude) || longitude < MIN_LONGITUDE || longitude > MAX_LONGITUDE) {
      throw new InvalidCoordinateError(`Longitude out of range [-180, 180]: ${longitude}`);
    }
    if (!Number.isFinite(latitude) || latitude < MIN_LATITUDE || latitude > MAX_LATITUDE) {
      throw new InvalidCoordinateError(`Latitude out of range [-90, 90]: ${latitude}`);
    }
    return new Coordinate(longitude, latitude);
  }

  equals(other: Coordinate): boolean {
    return this.longitude === other.longitude && this.latitude === other.latitude;
  }
}
