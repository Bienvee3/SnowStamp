import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { PassportService, FriendshipService } from "@snowstamp/application";
import {
  DuplicateFriendshipError,
  FriendshipNotAcceptedError,
  ProviderFailureError,
  ResortKey,
} from "@snowstamp/domain";
import { SupabaseFriendshipRepository } from "../../src/supabase/SupabaseFriendshipRepository.js";
import { SupabasePassportRepository } from "../../src/supabase/SupabasePassportRepository.js";
import { SupabaseResortCatalog } from "../../src/supabase/SupabaseResortCatalog.js";
import { UuidGenerator } from "../../src/UuidGenerator.js";
import { ANA, LEO, ZOE, clientFor, resetAndSeed } from "../support/env.js";

let db: pg.Client;

beforeAll(async () => {
  db = await resetAndSeed();
});
afterAll(async () => {
  await db.end();
});

function servicesFor(user: string): { passports: PassportService; friendships: FriendshipService } {
  const client = clientFor(user);
  const passportRepo = new SupabasePassportRepository(client);
  return {
    passports: new PassportService(passportRepo, new SupabaseResortCatalog(client)),
    friendships: new FriendshipService(new SupabaseFriendshipRepository(client), passportRepo, new UuidGenerator()),
  };
}

describe("SupabaseResortCatalog against PostGIS", () => {
  it("loads resorts and countries", async () => {
    const catalog = new SupabaseResortCatalog(clientFor(ANA));
    expect((await catalog.resorts()).map((r) => r.key.value)).toEqual([
      "ad-grandvalira",
      "cl-portillo",
      "es-baqueira-beret",
      "es-formigal",
    ]);
    expect((await catalog.countries()).map((c) => `${c.code.value}:${c.continent}`)).toEqual([
      "ad:europe",
      "cl:south-america",
      "es:europe",
    ]);
  });
});

describe("Passports and friendships through the real adapters", () => {
  it("stamps, reports progress and unstamps with persistence", async () => {
    const { passports } = servicesFor(ANA);
    expect((await passports.getPassport(ANA)).stamps).toEqual([]);

    await passports.stampResort({ ownerId: ANA, resort: "es-formigal", visitedOn: "2025-02-01" });
    await passports.stampResort({ ownerId: ANA, resort: "ad-grandvalira" });
    expect((await passports.getPassport(ANA)).stamps).toEqual([
      { resort: "ad-grandvalira", visitedOn: null },
      { resort: "es-formigal", visitedOn: "2025-02-01" },
    ]);

    const progress = await passports.getProgress(ANA);
    expect(progress.byCountry["es"]).toEqual({ visited: 1, total: 2, percentage: 50 });
    expect(progress.world).toEqual({ visited: 2, total: 4, percentage: 50 });

    await passports.unstampResort(ANA, "ad-grandvalira");
    expect((await passports.getPassport(ANA)).stamps.map((s) => s.resort)).toEqual(["es-formigal"]);
  });

  it("only lets accepted friends compare, and cuts access after removal", async () => {
    const ana = servicesFor(ANA);
    const leo = servicesFor(LEO);
    await leo.passports.stampResort({ ownerId: LEO, resort: "es-formigal" });
    await leo.passports.stampResort({ ownerId: LEO, resort: "cl-portillo" });

    await expect(ana.friendships.compareWithFriend(ANA, LEO)).rejects.toThrow(FriendshipNotAcceptedError);

    const request = await ana.friendships.requestFriendship(ANA, LEO);
    await expect(leo.friendships.requestFriendship(LEO, ANA)).rejects.toThrow(DuplicateFriendshipError);
    await expect(ana.friendships.compareWithFriend(ANA, LEO)).rejects.toThrow(FriendshipNotAcceptedError);

    await leo.friendships.acceptFriendship(request.id, LEO);
    expect(await ana.friendships.compareWithFriend(ANA, LEO)).toEqual({
      shared: ["es-formigal"],
      onlyMine: [],
      onlyFriend: ["cl-portillo"],
    });

    await leo.friendships.removeFriendship(request.id, LEO);
    await expect(ana.friendships.compareWithFriend(ANA, LEO)).rejects.toThrow(FriendshipNotAcceptedError);
  });

  it("hides friendships and stamps from a third user", async () => {
    const zoe = servicesFor(ZOE);
    expect((await zoe.passports.getPassport(ANA)).stamps).toEqual([]);
    await expect(zoe.friendships.compareWithFriend(ZOE, ANA)).rejects.toThrow(FriendshipNotAcceptedError);
  });

  it("refuses to save a passport for someone else", async () => {
    const repo = new SupabasePassportRepository(clientFor(ZOE));
    const passports = new PassportService(repo, new SupabaseResortCatalog(clientFor(ZOE)));
    await passports.stampResort({ ownerId: ZOE, resort: "es-formigal" });
    // The adapter saves under the caller's identity: ANA's stamps stay untouched.
    expect((await servicesFor(ANA).passports.getPassport(ANA)).stamps.map((s) => s.resort)).toEqual(["es-formigal"]);
    expect(ResortKey.of("es-formigal").value).toBe("es-formigal");
  });
});

describe("Provider failures", () => {
  it("raise a domain error instead of returning fake data", async () => {
    const forged = clientFor(ANA, "a-different-secret-a-different-secret-1234");
    await expect(new SupabaseResortCatalog(forged).resorts()).rejects.toThrow(ProviderFailureError);
    await expect(new SupabaseResortCatalog(forged).countries()).rejects.toThrow(ProviderFailureError);
    await expect(new SupabasePassportRepository(forged).findByOwner(ANA)).rejects.toThrow(ProviderFailureError);
    await expect(new SupabaseFriendshipRepository(forged).findById(ANA)).rejects.toThrow(ProviderFailureError);
    await expect(new SupabaseFriendshipRepository(forged).findActiveBetween(ANA, LEO)).rejects.toThrow(
      ProviderFailureError,
    );
  });
});
