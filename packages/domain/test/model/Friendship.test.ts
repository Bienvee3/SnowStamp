import { describe, expect, it } from "vitest";
import {
  InvalidFriendshipError,
  InvalidStateTransitionError,
  NotAFriendshipPartyError,
} from "../../src/exception/DomainError.js";
import { Friendship, FriendshipState } from "../../src/model/Friendship.js";

const request = (): Friendship => Friendship.request("f-1", "ana", "leo");

describe("Friendship", () => {
  it("starts as requested and cannot be with oneself", () => {
    expect(request().state).toBe(FriendshipState.Requested);
    expect(() => Friendship.request("f-2", "ana", "ana")).toThrow(InvalidFriendshipError);
  });

  it("is accepted by the addressee", () => {
    const friendship = request();
    friendship.accept("leo");
    expect(friendship.state).toBe(FriendshipState.Accepted);
  });

  it("cannot be accepted by the requester or a stranger", () => {
    expect(() => request().accept("ana")).toThrow(NotAFriendshipPartyError);
    expect(() => request().accept("zoe")).toThrow(NotAFriendshipPartyError);
  });

  it("cannot be accepted twice", () => {
    const friendship = request();
    friendship.accept("leo");
    expect(() => friendship.accept("leo")).toThrow(InvalidStateTransitionError);
  });

  it("can be removed from requested (cancel or decline) and from accepted", () => {
    const cancelled = request();
    cancelled.remove("ana");
    expect(cancelled.state).toBe(FriendshipState.Removed);

    const ended = request();
    ended.accept("leo");
    ended.remove("leo");
    expect(ended.state).toBe(FriendshipState.Removed);
  });

  it("only a party can remove it, and removed is terminal", () => {
    const friendship = request();
    expect(() => friendship.remove("zoe")).toThrow(NotAFriendshipPartyError);
    friendship.remove("ana");
    expect(() => friendship.remove("leo")).toThrow(InvalidStateTransitionError);
    expect(() => friendship.accept("leo")).toThrow(InvalidStateTransitionError);
  });

  it("knows its parties and is equal by id", () => {
    const friendship = request();
    expect(friendship.involves("ana")).toBe(true);
    expect(friendship.involves("leo")).toBe(true);
    expect(friendship.involves("zoe")).toBe(false);
    expect(friendship.equals(Friendship.request("f-1", "x", "y"))).toBe(true);
  });
});
