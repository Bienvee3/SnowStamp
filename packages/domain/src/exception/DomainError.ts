/** Base class for every error raised by the domain. */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidCoordinateError extends DomainError {}
export class InvalidGeometryError extends DomainError {}
export class InvalidResortKeyError extends DomainError {}
export class InvalidCountryCodeError extends DomainError {}
export class InvalidVisitDateError extends DomainError {}
export class InvalidResortError extends DomainError {}
export class DuplicateStampError extends DomainError {}
export class StampNotFoundError extends DomainError {}
export class UnknownResortError extends DomainError {}
export class InvalidFriendshipError extends DomainError {}
export class InvalidStateTransitionError extends DomainError {}
export class NotAFriendshipPartyError extends DomainError {}
export class DuplicateFriendshipError extends DomainError {}
export class FriendshipNotFoundError extends DomainError {}
export class FriendshipNotAcceptedError extends DomainError {}
