import type { PostgrestClient } from "@supabase/postgrest-js";
import { describe, expect, it } from "vitest";
import { Friendship, FriendshipState, ProviderFailureError } from "@snowstamp/domain";
import { SupabaseFriendshipRepository } from "../../src/supabase/SupabaseFriendshipRepository.js";
import { SupabaseResortCatalog } from "../../src/supabase/SupabaseResortCatalog.js";
import { ANA, LEO, ZOE, clientFor } from "../support/env.js";

/** A client whose every query resolves to the given rows. It stands in for corrupt stored data only. */
function clientReturning(rows: unknown): PostgrestClient {
  const result = { data: rows, error: null };
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "order", "eq", "neq", "or"]) {
    chain[method] = () => chain;
  }
  chain["maybeSingle"] = () => Promise.resolve(result);
  chain["then"] = (resolve: (value: unknown) => unknown) => resolve(result);
  return { from: () => chain, rpc: () => Promise.resolve(result) } as unknown as PostgrestClient;
}

describe("adapters reject data that breaks domain assumptions", () => {
  it("rejects a non-MultiPolygon area", async () => {
    const row = { key: "es-x", name: "X", country_code: "es", area: { type: "Point", coordinates: [] } };
    await expect(new SupabaseResortCatalog(clientReturning([row])).resorts()).rejects.toThrow(ProviderFailureError);
  });

  it("rejects an unknown continent", async () => {
    const rows = [{ code: "es", continent: "atlantis" }];
    await expect(new SupabaseResortCatalog(clientReturning(rows)).countries()).rejects.toThrow(ProviderFailureError);
  });

  it("rejects an unknown friendship state", async () => {
    const row = { id: "f", requester_id: ANA, addressee_id: LEO, state: "frozen" };
    await expect(new SupabaseFriendshipRepository(clientReturning(row)).findById("f")).rejects.toThrow(
      ProviderFailureError,
    );
  });

  it("returns null when no friendship row exists", async () => {
    await expect(new SupabaseFriendshipRepository(clientReturning(null)).findById("f")).resolves.toBeNull();
  });
});

describe("write failures surface as provider errors", () => {
  it("friendship update with a forged token", async () => {
    const forged = clientFor(ANA, "a-different-secret-a-different-secret-1234");
    const friendship = Friendship.request("00000000-0000-0000-0000-0000000000f1", ANA, LEO);
    await expect(new SupabaseFriendshipRepository(forged).save(friendship)).rejects.toThrow(ProviderFailureError);
  });

  it("friendship insert for a requester other than the caller", async () => {
    const friendship = Friendship.restore("00000000-0000-0000-0000-0000000000f2", ANA, LEO, FriendshipState.Requested);
    await expect(new SupabaseFriendshipRepository(clientFor(ZOE)).save(friendship)).rejects.toThrow(
      ProviderFailureError,
    );
  });
});
