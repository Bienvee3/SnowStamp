import { randomUUID } from "node:crypto";
import type { IdGenerator } from "@snowstamp/domain";

/** Real adapter for the IdGenerator port: random UUIDs. */
export class UuidGenerator implements IdGenerator {
  next(): string {
    return randomUUID();
  }
}
