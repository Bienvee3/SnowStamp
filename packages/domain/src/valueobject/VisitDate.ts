import { InvalidVisitDateError } from "../exception/DomainError.js";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A calendar date (YYYY-MM-DD) without time or zone. */
export class VisitDate {
  private constructor(readonly value: string) {}

  static of(value: string): VisitDate {
    const match = ISO_DATE_PATTERN.exec(value);
    if (match === null) {
      throw new InvalidVisitDateError(`Visit date must be YYYY-MM-DD: "${value}"`);
    }
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(Date.UTC(year, month - 1, day));
    const isRealDate =
      date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    if (!isRealDate) {
      throw new InvalidVisitDateError(`Not a real calendar date: "${value}"`);
    }
    return new VisitDate(value);
  }

  equals(other: VisitDate): boolean {
    return this.value === other.value;
  }
}
