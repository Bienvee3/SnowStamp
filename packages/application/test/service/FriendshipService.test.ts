import { beforeEach, describe, expect, it } from "vitest";
import {
  DuplicateFriendshipError,
  FriendshipNotAcceptedError,
  FriendshipNotFoundError,
  NotAFriendshipPartyError,
} from "@snowstamp/domain";
import { FriendshipService } from "../../src/service/FriendshipService.js";
import { PassportService } from "../../src/service/PassportService.js";
import { FixedCatalog, InMemoryFriendships, InMemoryPassports, SequentialIds } from "../support/inMemory.js";

let friendships: FriendshipService;
let passports: PassportService;

beforeEach(() => {
  const passportRepo = new InMemoryPassports();
  passports = new PassportService(passportRepo, new FixedCatalog());
  friendships = new FriendshipService(new InMemoryFriendships(), passportRepo, new SequentialIds());
});

describe("FriendshipService commands", () => {
  it("requests, accepts and removes a friendship", async () => {
    const requested = await friendships.requestFriendship("ana", "leo");
    expect(requested).toEqual({ id: "id-1", requesterId: "ana", addresseeId: "leo", state: "requested" });

    expect((await friendships.acceptFriendship("id-1", "leo")).state).toBe("accepted");
    expect((await friendships.removeFriendship("id-1", "ana")).state).toBe("removed");
  });

  it("rejects a second active friendship between the same users, in either direction", async () => {
    await friendships.requestFriendship("ana", "leo");
    await expect(friendships.requestFriendship("ana", "leo")).rejects.toThrow(DuplicateFriendshipError);
    await expect(friendships.requestFriendship("leo", "ana")).rejects.toThrow(DuplicateFriendshipError);
  });

  it("allows a new request after the previous friendship was removed", async () => {
    await friendships.requestFriendship("ana", "leo");
    await friendships.removeFriendship("id-1", "leo");
    await expect(friendships.requestFriendship("ana", "leo")).resolves.toMatchObject({ state: "requested" });
  });

  it("fails on unknown ids and on a wrong actor", async () => {
    await expect(friendships.acceptFriendship("missing", "leo")).rejects.toThrow(FriendshipNotFoundError);
    await friendships.requestFriendship("ana", "leo");
    await expect(friendships.acceptFriendship("id-1", "ana")).rejects.toThrow(NotAFriendshipPartyError);
  });
});

describe("FriendshipService.compareWithFriend", () => {
  async function befriend(): Promise<void> {
    await friendships.requestFriendship("ana", "leo");
    await friendships.acceptFriendship("id-1", "leo");
  }

  it("compares the passports of accepted friends", async () => {
    await befriend();
    await passports.stampResort({ ownerId: "ana", resort: "es-formigal" });
    await passports.stampResort({ ownerId: "ana", resort: "ad-grandvalira" });
    await passports.stampResort({ ownerId: "leo", resort: "es-formigal" });

    expect(await friendships.compareWithFriend("ana", "leo")).toEqual({
      shared: ["es-formigal"],
      onlyMine: ["ad-grandvalira"],
      onlyFriend: [],
    });
  });

  it("treats a friend without a passport as empty", async () => {
    await befriend();
    await passports.stampResort({ ownerId: "ana", resort: "es-formigal" });
    expect((await friendships.compareWithFriend("ana", "leo")).onlyMine).toEqual(["es-formigal"]);
  });

  it("refuses strangers and pending requests", async () => {
    await expect(friendships.compareWithFriend("ana", "leo")).rejects.toThrow(FriendshipNotAcceptedError);
    await friendships.requestFriendship("ana", "leo");
    await expect(friendships.compareWithFriend("ana", "leo")).rejects.toThrow(FriendshipNotAcceptedError);
  });
});
