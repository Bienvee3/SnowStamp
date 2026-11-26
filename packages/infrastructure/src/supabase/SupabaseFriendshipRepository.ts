import type { PostgrestClient } from "@supabase/postgrest-js";
import { Friendship, FriendshipRepository, FriendshipState, ProviderFailureError } from "@snowstamp/domain";

interface FriendshipRow {
  readonly id: string;
  readonly requester_id: string;
  readonly addressee_id: string;
  readonly state: string;
}

const STATES = new Set<string>(Object.values(FriendshipState));

function toFriendship(row: FriendshipRow): Friendship {
  if (!STATES.has(row.state)) {
    throw new ProviderFailureError(`Unknown friendship state "${row.state}"`);
  }
  return Friendship.restore(row.id, row.requester_id, row.addressee_id, row.state as FriendshipState);
}

/** Supabase adapter for friendships. RLS limits every read and write to the parties involved. */
export class SupabaseFriendshipRepository implements FriendshipRepository {
  constructor(private readonly client: PostgrestClient) {}

  async findById(id: string): Promise<Friendship | null> {
    const { data, error } = await this.client.from("friendships").select("*").eq("id", id).maybeSingle();
    if (error !== null) {
      throw new ProviderFailureError(`Could not load friendship: ${error.message}`);
    }
    return data === null ? null : toFriendship(data as FriendshipRow);
  }

  async findActiveBetween(userA: string, userB: string): Promise<Friendship | null> {
    const { data, error } = await this.client
      .from("friendships")
      .select("*")
      .neq("state", FriendshipState.Removed)
      .or(
        `and(requester_id.eq.${userA},addressee_id.eq.${userB}),and(requester_id.eq.${userB},addressee_id.eq.${userA})`,
      )
      .maybeSingle();
    if (error !== null) {
      throw new ProviderFailureError(`Could not load friendship: ${error.message}`);
    }
    return data === null ? null : toFriendship(data as FriendshipRow);
  }

  /** Updates the state of a stored friendship, or inserts a new one. Upsert is avoided: its insert check would block accepting. */
  async save(friendship: Friendship): Promise<void> {
    const updated = await this.client
      .from("friendships")
      .update({ state: friendship.state })
      .eq("id", friendship.id)
      .select("id");
    if (updated.error !== null) {
      throw new ProviderFailureError(`Could not save friendship: ${updated.error.message}`);
    }
    if ((updated.data as unknown[]).length > 0) {
      return;
    }
    const { error } = await this.client.from("friendships").insert({
      id: friendship.id,
      requester_id: friendship.requesterId,
      addressee_id: friendship.addresseeId,
      state: friendship.state,
    });
    if (error !== null) {
      throw new ProviderFailureError(`Could not save friendship: ${error.message}`);
    }
  }
}
