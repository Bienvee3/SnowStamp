import { InvalidCountryCodeError } from "../exception/DomainError.js";

const COUNTRY_CODE_PATTERN = /^[a-z]{2}$/;

/** Lowercase ISO 3166-1 alpha-2 code. */
export class CountryCode {
  private constructor(readonly value: string) {}

  static of(value: string): CountryCode {
    if (!COUNTRY_CODE_PATTERN.test(value)) {
      throw new InvalidCountryCodeError(`Invalid country code: "${value}"`);
    }
    return new CountryCode(value);
  }

  equals(other: CountryCode): boolean {
    return this.value === other.value;
  }
}
