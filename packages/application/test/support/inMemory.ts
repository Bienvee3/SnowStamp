import {
  Country,
  Friendship,
  FriendshipRepository,
  FriendshipState,
  IdGenerator,
  Passport,
  PassportRepository,
  Resort,
  ResortArea,
  ResortCatalog,
  ResortKey,
  Coordinate,
  Continent,
  CountryCode,
} from "@snowstamp/domain";

/** Offline stub adapters used by application tests (the same ones serve local development). */
export class InMemoryPassports implements PassportRepository {
  private readonly store = new Map<string, Passport>();
  async findByOwner(ownerId: string): Promise<Passport | null> {
    return this.store.get(ownerId) ?? null;
  }
  async save(passport: Passport): Promise<void> {
    this.store.set(passport.ownerId, passport);
  }
}

export class InMemoryFriendships implements FriendshipRepository {
  private readonly store = new Map<string, Friendship>();
  async findById(id: string): Promise<Friendship | null> {
    return this.store.get(id) ?? null;
  }
  async findActiveBetween(a: string, b: string): Promise<Friendship | null> {
    return (
      [...this.store.values()].find(
        (f) => f.state !== FriendshipState.Removed && f.involves(a) && f.involves(b),
      ) ?? null
    );
  }
  async save(friendship: Friendship): Promise<void> {
    this.store.set(friendship.id, friendship);
  }
}

export class SequentialIds implements IdGenerator {
  private counter = 0;
  next(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

const box = (west: number, south: number, east: number, north: number): ResortArea => {
  const c = (x: number, y: number): Coordinate => Coordinate.of(x, y);
  return ResortArea.of([{ outer: [c(west, south), c(east, south), c(east, north), c(west, north), c(west, south)], holes: [] }]);
};

export class FixedCatalog implements ResortCatalog {
  private readonly all = [
    Resort.create(ResortKey.of("es-formigal"), "Formigal", box(-0.42, 42.76, -0.34, 42.8)),
    Resort.create(ResortKey.of("es-baqueira-beret"), "Baqueira Beret", box(0.9, 42.68, 0.98, 42.72)),
    Resort.create(ResortKey.of("ad-grandvalira"), "Grandvalira", box(1.6, 42.52, 1.74, 42.58)),
  ];
  async resorts(): Promise<readonly Resort[]> {
    return this.all;
  }
  async countries(): Promise<readonly Country[]> {
    return [
      Country.of(CountryCode.of("es"), Continent.Europe),
      Country.of(CountryCode.of("ad"), Continent.Europe),
    ];
  }
}
