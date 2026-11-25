import {
  InvalidFriendshipError,
  InvalidStateTransitionError,
  NotAFriendshipPartyError,
} from "../exception/DomainError.js";

export enum FriendshipState {
  Requested = "requested",
  Accepted = "accepted",
  Removed = "removed",
}

/**
 * Aggregate: a friendship between two users.
 * requested -> accepted (only by the addressee), requested -> removed (either party: decline or cancel),
 * accepted -> removed (either party). Removed is terminal.
 */
export class Friendship {
  private currentState = FriendshipState.Requested;

  private constructor(
    readonly id: string,
    readonly requesterId: string,
    readonly addresseeId: string,
  ) {}

  static request(id: string, requesterId: string, addresseeId: string): Friendship {
    if (requesterId === addresseeId) {
      throw new InvalidFriendshipError("A user cannot befriend themselves");
    }
    return new Friendship(id, requesterId, addresseeId);
  }

  get state(): FriendshipState {
    return this.currentState;
  }

  accept(userId: string): void {
    if (userId !== this.addresseeId) {
      throw new NotAFriendshipPartyError("Only the addressee can accept a request");
    }
    this.transition(FriendshipState.Requested, FriendshipState.Accepted);
  }

  remove(userId: string): void {
    if (userId !== this.requesterId && userId !== this.addresseeId) {
      throw new NotAFriendshipPartyError("Only a party of the friendship can remove it");
    }
    if (this.currentState === FriendshipState.Removed) {
      throw new InvalidStateTransitionError("Friendship is already removed");
    }
    this.currentState = FriendshipState.Removed;
  }

  involves(userId: string): boolean {
    return userId === this.requesterId || userId === this.addresseeId;
  }

  equals(other: Friendship): boolean {
    return this.id === other.id;
  }

  private transition(from: FriendshipState, to: FriendshipState): void {
    if (this.currentState !== from) {
      throw new InvalidStateTransitionError(`Cannot go from ${this.currentState} to ${to}`);
    }
    this.currentState = to;
  }
}
