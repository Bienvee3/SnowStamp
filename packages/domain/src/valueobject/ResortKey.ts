import { InvalidResortKeyError } from "../exception/DomainError.js";

const RESORT_KEY_PATTERN = /^[a-z]{2}-[a-z0-9]+(-[a-z0-9]+)*$/;

/** Stable business key of a resort: lowercase ISO country code, a dash and a slug, e.g. `es-formigal`. */
export class ResortKey {
  private constructor(readonly value: string) {}

  static of(value: string): ResortKey {
    if (!RESORT_KEY_PATTERN.test(value)) {
      throw new InvalidResortKeyError(`Invalid resort key: "${value}"`);
    }
    return new ResortKey(value);
  }

  get countryCode(): string {
    return this.value.slice(0, 2);
  }

  equals(other: ResortKey): boolean {
    return this.value === other.value;
  }
}
