create table public.stamps (
  user_id uuid not null references auth.users (id) on delete cascade,
  resort_key text not null references public.resorts (key),
  visited_on date,
  primary key (user_id, resort_key)
);

create type public.friendship_state as enum ('requested', 'accepted', 'removed');

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  state public.friendship_state not null default 'requested',
  constraint friendships_not_self check (requester_id <> addressee_id)
);

-- At most one active (requested or accepted) friendship per pair, in either direction.
create unique index friendships_active_pair_uidx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id))
  where state <> 'removed';

create function public.are_friends(a uuid, b uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.state = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  );
$$;

alter table public.stamps enable row level security;
alter table public.friendships enable row level security;

create policy stamps_owner_all on public.stamps
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy stamps_friends_read on public.stamps
  for select using (public.are_friends(auth.uid(), user_id));

create policy friendships_party_read on public.friendships
  for select using (auth.uid() in (requester_id, addressee_id));
create policy friendships_request on public.friendships
  for insert with check (requester_id = auth.uid() and state = 'requested');
-- Accepting is reserved to the addressee; either party may remove. The domain enforces the full state machine.
create policy friendships_party_update on public.friendships
  for update using (auth.uid() in (requester_id, addressee_id))
  with check (
    (state = 'accepted' and addressee_id = auth.uid())
    or (state = 'removed' and auth.uid() in (requester_id, addressee_id))
  );
