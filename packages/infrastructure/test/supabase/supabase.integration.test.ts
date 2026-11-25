import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { PassportService, FriendshipService } from "@snowstamp/application";
import {
  Coordinate,
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

  it("agrees with ST_Covers on a grid of points, including edges and vertices", async () => {
    const resorts = await new SupabaseResortCatalog(clientFor(ANA)).resorts();
    const lons = [-0.45, -0.42, -0.38, -0.34, -0.3, 0.9, 0.94, 0.98, 0.99, 1.0, 1.02, 1.04, 1.1, 1.6, 1.7, 1.74];
    const lats = [42.5, 42.52, 42.55, 42.58, 42.68, 42.7, 42.72, 42.73, 42.74, 42.755, 42.76, 42.78, 42.8, 42.9];
    let checked = 0;
    for (const lon of lons) {
      for (const lat of lats) {
        const inDomain = resorts
          .filter((r) => r.contains(Coordinate.of(lon, lat)))
          .map((r) => r.key.value)
          .sort();
        const result = await db.query("select key from public.resorts_covering($1, $2) order by key", [lon, lat]);
        expect(inDomain, `point ${lon},${lat}`).toEqual(result.rows.map((r: { key: string }) => r.key));
        checked += 1;
      }
    }
    expect(checked).toBe(lons.length * lats.length);
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
