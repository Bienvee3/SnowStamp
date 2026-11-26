create type public.continent as enum (
  'africa', 'antarctica', 'asia', 'europe', 'north-america', 'oceania', 'south-america'
);

create table public.countries (
  code text primary key check (code ~ '^[a-z]{2}$'),
  name text not null check (length(btrim(name)) > 0),
  continent public.continent not null
);

create table public.resorts (
  key text primary key check (key ~ '^[a-z]{2}-[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) > 0),
  country_code text not null references public.countries (code),
  area extensions.geometry(MultiPolygon, 4326) not null check (extensions.ST_IsValid(area)),
  -- The key starts with the country code (domain rule: ResortKey.countryCode).
  constraint resorts_key_matches_country check (left(key, 2) = country_code)
);

create index resorts_area_gix on public.resorts using gist (area);
create index resorts_country_idx on public.resorts (country_code);

-- Reference data is public and read-only for clients; it is loaded by the curation pipeline.
alter table public.countries enable row level security;
alter table public.resorts enable row level security;
create policy countries_read on public.countries for select using (true);
create policy resorts_read on public.resorts for select using (true);

-- Resorts whose skiable domain covers a GPS position (boundary counts as inside).
create function public.resorts_covering(lon double precision, lat double precision)
returns setof public.resorts
language sql stable
set search_path = public, extensions
as $$
  select r.*
  from public.resorts r
  where ST_Covers(r.area, ST_SetSRID(ST_MakePoint(lon, lat), 4326));
$$;
