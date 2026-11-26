import {
  DuplicateFriendshipError,
  Friendship,
  FriendshipNotAcceptedError,
  FriendshipNotFoundError,
  FriendshipRepository,
  FriendshipState,
  IdGenerator,
  Passport,
  PassportRepository,
  comparePassports,
} from "@snowstamp/domain";
import { ComparisonDto, FriendshipDto } from "../dto/Dtos.js";

export class FriendshipService {
  constructor(
    private readonly friendships: FriendshipRepository,
    private readonly passports: PassportRepository,
    private readonly ids: IdGenerator,
  ) {}

  /** Command. */
  async requestFriendship(requesterId: string, addresseeId: string): Promise<FriendshipDto> {
    const friendship = Friendship.request(this.ids.next(), requesterId, addresseeId);
    if ((await this.friendships.findActiveBetween(requesterId, addresseeId)) !== null) {
      throw new DuplicateFriendshipError(`A friendship already exists between ${requesterId} and ${addresseeId}`);
    }
    await this.friendships.save(friendship);
    return FriendshipDto.from(friendship);
  }

  /** Command. */
  async acceptFriendship(friendshipId: string, userId: string): Promise<FriendshipDto> {
    const friendship = await this.require(friendshipId);
    friendship.accept(userId);
    await this.friendships.save(friendship);
    return FriendshipDto.from(friendship);
  }

  /** Command. Cancels, declines or ends a friendship. */
  async removeFriendship(friendshipId: string, userId: string): Promise<FriendshipDto> {
    const friendship = await this.require(friendshipId);
    friendship.remove(userId);
    await this.friendships.save(friendship);
    return FriendshipDto.from(friendship);
  }

  /** Query. Only accepted friends can compare passports. */
  async compareWithFriend(userId: string, friendId: string): Promise<ComparisonDto> {
    const friendship = await this.friendships.findActiveBetween(userId, friendId);
    if (friendship === null || friendship.state !== FriendshipState.Accepted) {
      throw new FriendshipNotAcceptedError(`${userId} and ${friendId} are not friends`);
    }
    const [mine, theirs] = await Promise.all([
      this.passports.findByOwner(userId),
      this.passports.findByOwner(friendId),
    ]);
    return ComparisonDto.from(comparePassports(mine ?? Passport.open(userId), theirs ?? Passport.open(friendId)));
  }

  private async require(friendshipId: string): Promise<Friendship> {
    const friendship = await this.friendships.findById(friendshipId);
    if (friendship === null) {
      throw new FriendshipNotFoundError(`Friendship not found: ${friendshipId}`);
    }
    return friendship;
  }
}
