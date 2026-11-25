import { Country } from "../model/Country.js";
import { Friendship } from "../model/Friendship.js";
import { Passport } from "../model/Passport.js";
import { Resort } from "../model/Resort.js";

/** Read-only reference data: the resort and country catalog. */
export interface ResortCatalog {
  resorts(): Promise<readonly Resort[]>;
  countries(): Promise<readonly Country[]>;
}

export interface PassportRepository {
  findByOwner(ownerId: string): Promise<Passport | null>;
  save(passport: Passport): Promise<void>;
}

export interface FriendshipRepository {
  findById(id: string): Promise<Friendship | null>;
  /** The requested or accepted friendship between two users, in either direction. Removed ones are ignored. */
  findActiveBetween(userA: string, userB: string): Promise<Friendship | null>;
  save(friendship: Friendship): Promise<void>;
}

/** Port: source of new unique identifiers. */
export interface IdGenerator {
  next(): string;
}
