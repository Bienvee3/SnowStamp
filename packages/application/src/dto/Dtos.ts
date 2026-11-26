import { Friendship, Passport, PassportComparisonResult, Progress, VisitedProgress } from "@snowstamp/domain";

export interface StampDto {
  readonly resort: string;
  readonly visitedOn: string | null;
}

export interface PassportDto {
  readonly ownerId: string;
  readonly stamps: readonly StampDto[];
}

export const PassportDto = {
  from(passport: Passport): PassportDto {
    return {
      ownerId: passport.ownerId,
      stamps: passport.stamps().map((s) => ({ resort: s.resort.value, visitedOn: s.visitedOn?.value ?? null })),
    };
  },
};

export interface ProgressDto {
  readonly visited: number;
  readonly total: number;
  readonly percentage: number;
}

export interface VisitedProgressDto {
  readonly world: ProgressDto;
  readonly byCountry: Readonly<Record<string, ProgressDto>>;
  readonly byContinent: Readonly<Record<string, ProgressDto>>;
}

const toProgressDto = (p: Progress): ProgressDto => ({ visited: p.visited, total: p.total, percentage: p.percentage });

export const VisitedProgressDto = {
  from(progress: VisitedProgress): VisitedProgressDto {
    return {
      world: toProgressDto(progress.world),
      byCountry: Object.fromEntries([...progress.byCountry].map(([k, v]) => [k, toProgressDto(v)])),
      byContinent: Object.fromEntries([...progress.byContinent].map(([k, v]) => [k, toProgressDto(v)])),
    };
  },
};

export interface FriendshipDto {
  readonly id: string;
  readonly requesterId: string;
  readonly addresseeId: string;
  readonly state: string;
}

export const FriendshipDto = {
  from(friendship: Friendship): FriendshipDto {
    return {
      id: friendship.id,
      requesterId: friendship.requesterId,
      addresseeId: friendship.addresseeId,
      state: friendship.state,
    };
  },
};

export interface ComparisonDto {
  readonly shared: readonly string[];
  readonly onlyMine: readonly string[];
  readonly onlyFriend: readonly string[];
}

export const ComparisonDto = {
  from(result: PassportComparisonResult): ComparisonDto {
    return { shared: result.shared, onlyMine: result.onlyFirst, onlyFriend: result.onlySecond };
  },
};
