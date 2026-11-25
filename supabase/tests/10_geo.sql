-- Mirrors packages/domain/test/service/ResortMembership.test.ts (illustrative polygons, not real boundaries).
insert into public.countries (code, name, continent) values ('es', 'Spain', 'europe'), ('ad', 'Andorra', 'europe');
insert into public.resorts (key, name, country_code, area) values
  ('es-formigal', 'Formigal', 'es',
   extensions.ST_Multi(extensions.ST_GeomFromText('POLYGON((-0.42 42.76,-0.34 42.76,-0.34 42.8,-0.42 42.8,-0.42 42.76))', 4326))),
  ('es-baqueira-beret', 'Baqueira Beret', 'es',
   extensions.ST_GeomFromText('MULTIPOLYGON(((0.9 42.68,0.98 42.68,0.98 42.72,0.9 42.72,0.9 42.68)),((1.0 42.7,1.04 42.7,1.04 42.73,1.0 42.73,1.0 42.7)))', 4326));

do $$
declare
  keys text;
begin
  select coalesce(string_agg(key, ','), '') into keys from public.resorts_covering(-0.38, 42.78);
  assert keys = 'es-formigal', 'piste point: ' || keys;
  select coalesce(string_agg(key, ','), '') into keys from public.resorts_covering(1.02, 42.72);
  assert keys = 'es-baqueira-beret', 'second polygon: ' || keys;
  select coalesce(string_agg(key, ','), '') into keys from public.resorts_covering(-0.372, 42.755);
  assert keys = '', 'car park must be outside: ' || keys;
  select coalesce(string_agg(key, ','), '') into keys from public.resorts_covering(-0.36, 42.74);
  assert keys = '', 'access road must be outside: ' || keys;
  select coalesce(string_agg(key, ','), '') into keys from public.resorts_covering(-0.38, 42.76);
  assert keys = 'es-formigal', 'boundary counts as inside: ' || keys;
end $$;

-- Constraints.
do $$ begin
  begin
    insert into public.resorts (key, name, country_code, area) values
      ('ad-x', 'Wrong country', 'es', extensions.ST_Multi(extensions.ST_GeomFromText('POLYGON((0 0,1 0,1 1,0 0))', 4326)));
    assert false, 'key/country mismatch accepted';
  exception when check_violation then null; end;
  begin
    insert into public.resorts (key, name, country_code, area) values
      ('es-bowtie', 'Invalid geometry', 'es', extensions.ST_Multi(extensions.ST_GeomFromText('POLYGON((0 0,1 1,1 0,0 1,0 0))', 4326)));
    assert false, 'invalid geometry accepted';
  exception when check_violation then null; end;
  begin
    insert into public.resorts (key, name, country_code, area) values
      ('BAD KEY', 'Bad key', 'es', extensions.ST_Multi(extensions.ST_GeomFromText('POLYGON((0 0,1 0,1 1,0 0))', 4326)));
    assert false, 'bad key accepted';
  exception when check_violation then null; end;
end $$;
