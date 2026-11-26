import { InvalidResortError } from "../exception/DomainError.js";
import { ResortArea } from "../valueobject/ResortArea.js";
import { ResortKey } from "../valueobject/ResortKey.js";

/** Reference data: a ski resort identified by its business key. Equality is on the key only. */
export class Resort {
  private constructor(
    readonly key: ResortKey,
    readonly name: string,
    readonly area: ResortArea,
  ) {}

  static create(key: ResortKey, name: string, area: ResortArea): Resort {
    if (name.trim().length === 0) {
      throw new InvalidResortError("A resort needs a name");
    }
    return new Resort(key, name.trim(), area);
  }

  get countryCode(): string {
    return this.key.countryCode;
  }

  equals(other: Resort): boolean {
    return this.key.equals(other.key);
  }
}
