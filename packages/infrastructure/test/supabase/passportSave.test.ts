import { describe, expect, it } from "vitest";
import { Passport, ProviderFailureError, ResortKey } from "@snowstamp/domain";
import { SupabasePassportRepository } from "../../src/supabase/SupabasePassportRepository.js";
import { ANA, clientFor } from "../support/env.js";

describe("SupabasePassportRepository.save failures", () => {
  it("surfaces a rejected save (unknown resort violates the foreign key)", async () => {
    const passport = Passport.open(ANA);
    passport.stamp(ResortKey.of("fr-nowhere"));
    await expect(new SupabasePassportRepository(clientFor(ANA)).save(passport)).rejects.toThrow(ProviderFailureError);
  });
});
