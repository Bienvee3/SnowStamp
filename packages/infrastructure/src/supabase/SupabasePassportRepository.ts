import type { PostgrestClient } from "@supabase/postgrest-js";
import { Passport, PassportRepository, ProviderFailureError, ResortKey, VisitDate } from "@snowstamp/domain";

interface StampRow {
  readonly resort_key: string;
  readonly visited_on: string | null;
}

/** Supabase adapter for passports. Reads follow RLS: the owner and accepted friends see the stamps. */
export class SupabasePassportRepository implements PassportRepository {
  constructor(private readonly client: PostgrestClient) {}

  /** Returns null when the user has no stamps (a passport with no stamps is not stored). */
  async findByOwner(ownerId: string): Promise<Passport | null> {
    const { data, error } = await this.client
      .from("stamps")
      .select("resort_key, visited_on")
      .eq("user_id", ownerId)
      .order("resort_key");
    if (error !== null) {
      throw new ProviderFailureError(`Could not load stamps: ${error.message}`);
    }
    const rows = data as StampRow[];
    if (rows.length === 0) {
      return null;
    }
    const passport = Passport.open(ownerId);
    for (const row of rows) {
      passport.stamp(ResortKey.of(row.resort_key), row.visited_on === null ? null : VisitDate.of(row.visited_on));
    }
    return passport;
  }

  /** Replaces the caller's stamps atomically. Only the authenticated owner can save. */
  async save(passport: Passport): Promise<void> {
    const stamps = passport.stamps().map((s) => ({ resort: s.resort.value, visited_on: s.visitedOn?.value ?? null }));
    const { error } = await this.client.rpc("replace_my_stamps", { stamps });
    if (error !== null) {
      throw new ProviderFailureError(`Could not save stamps: ${error.message}`);
    }
  }
}
