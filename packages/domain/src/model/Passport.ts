import { DuplicateStampError, StampNotFoundError } from "../exception/DomainError.js";
import { ResortKey } from "../valueobject/ResortKey.js";
import { VisitDate } from "../valueobject/VisitDate.js";

/** One visited resort, with an optional visit date. Child of Passport. */
export interface Stamp {
  readonly resort: ResortKey;
  readonly visitedOn: VisitDate | null;
}

/** Aggregate root: a user's stamps. The only entry point to mark or unmark a resort as visited. */
export class Passport {
  private readonly stampsByResort = new Map<string, Stamp>();

  private constructor(readonly ownerId: string) {}

  static open(ownerId: string): Passport {
    return new Passport(ownerId);
  }

  /** Command: stamp a resort. A resort can be stamped only once. */
  stamp(resort: ResortKey, visitedOn: VisitDate | null = null): void {
    if (this.stampsByResort.has(resort.value)) {
      throw new DuplicateStampError(`Resort already stamped: ${resort.value}`);
    }
    this.stampsByResort.set(resort.value, { resort, visitedOn });
  }

  /** Command: remove the stamp of a resort. */
  unstamp(resort: ResortKey): void {
    if (!this.stampsByResort.delete(resort.value)) {
      throw new StampNotFoundError(`Resort not stamped: ${resort.value}`);
    }
  }

  /** Query: unmodifiable snapshot of the stamps. */
  stamps(): readonly Stamp[] {
    return Object.freeze([...this.stampsByResort.values()]);
  }

  /** Query: whether a resort is stamped. */
  hasStamp(resort: ResortKey): boolean {
    return this.stampsByResort.has(resort.value);
  }

  equals(other: Passport): boolean {
    return this.ownerId === other.ownerId;
  }
}
