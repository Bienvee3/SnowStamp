-- Client-facing functions (called through PostgREST RPC). Both run with the caller's rights, so RLS applies.

-- Resort catalog with the area as GeoJSON, because PostgREST would return geometry as hex EWKB.
create function public.resort_catalog()
returns table (key text, name text, country_code text, area jsonb)
language sql stable
set search_path = public, extensions
as $$
  select r.key, r.name, r.country_code, ST_AsGeoJSON(r.area)::jsonb
  from public.resorts r
  order by r.key;
$$;

-- Replaces the caller's stamps in one transaction. Input: [{"resort": "es-formigal", "visited_on": "2025-02-01" | null}].
create function public.replace_my_stamps(stamps jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  delete from public.stamps where user_id = me;
  insert into public.stamps (user_id, resort_key, visited_on)
  select me, s.resort, s.visited_on
  from jsonb_to_recordset(stamps) as s(resort text, visited_on date);
end;
$$;
