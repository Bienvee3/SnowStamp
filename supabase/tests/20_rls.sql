insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'), ('00000000-0000-0000-0000-00000000000c');

create function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, true);
  set local role authenticated;
end $$;

do $$
declare
  a constant text := '00000000-0000-0000-0000-00000000000a';
  b constant text := '00000000-0000-0000-0000-00000000000b';
  c constant text := '00000000-0000-0000-0000-00000000000c';
  fid uuid;
  n int;
begin
  -- Reference data is readable by clients and not writable.
  perform pg_temp.as_user(a);
  select count(*) into n from public.resorts; assert n = 2, 'resorts readable';
  begin
    insert into public.countries values ('fr', 'France', 'europe');
    assert false, 'client wrote reference data';
  exception when insufficient_privilege or others then
    if sqlerrm = 'client wrote reference data' then raise; end if;
  end;
  reset role;

  -- Owner writes own stamps only.
  perform pg_temp.as_user(a);
  insert into public.stamps (user_id, resort_key) values (a::uuid, 'es-formigal');
  begin
    insert into public.stamps (user_id, resort_key) values (b::uuid, 'es-formigal');
    assert false, 'wrote a stamp for another user';
  exception when others then
    if sqlerrm = 'wrote a stamp for another user' then raise; end if;
  end;
  begin
    insert into public.stamps (user_id, resort_key) values (a::uuid, 'es-formigal');
    assert false, 'duplicate stamp accepted';
  exception when unique_violation then null; end;
  reset role;

  -- Strangers cannot read stamps.
  perform pg_temp.as_user(b);
  select count(*) into n from public.stamps; assert n = 0, 'stranger sees stamps';
  reset role;

  -- Friend request: b -> a. Requester cannot accept; addressee can.
  perform pg_temp.as_user(b);
  insert into public.friendships (requester_id, addressee_id) values (b::uuid, a::uuid) returning id into fid;
  begin
    update public.friendships set state = 'accepted' where id = fid;
    assert false, 'requester accepted own request';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.friendships (requester_id, addressee_id) values (b::uuid, a::uuid);
    assert false, 'duplicate active pair accepted';
  exception when unique_violation then null; end;
  begin
    insert into public.friendships (requester_id, addressee_id) values (b::uuid, b::uuid);
    assert false, 'self friendship accepted';
  exception when check_violation then null; end;
  reset role;

  perform pg_temp.as_user(c);
  select count(*) into n from public.friendships; assert n = 0, 'third party sees friendships';
  reset role;

  perform pg_temp.as_user(a);
  update public.friendships set state = 'accepted' where id = fid;
  select count(*) into n from public.friendships where state = 'accepted'; assert n = 1, 'addressee could not accept';
  reset role;

  -- Accepted friends can read each other's stamps; others still cannot.
  perform pg_temp.as_user(b);
  select count(*) into n from public.stamps; assert n = 1, 'friend cannot read stamps';
  reset role;
  perform pg_temp.as_user(c);
  select count(*) into n from public.stamps; assert n = 0, 'non-friend reads stamps';
  reset role;

  -- After removal the access disappears.
  perform pg_temp.as_user(b);
  update public.friendships set state = 'removed' where id = fid;
  select count(*) into n from public.stamps; assert n = 0, 'removed friend still reads stamps';
  reset role;
end $$;
