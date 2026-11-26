-- Illustrative polygons, not real boundaries.
insert into public.countries (code, name, continent) values ('es', 'Spain', 'europe'), ('ad', 'Andorra', 'europe');
insert into public.resorts (key, name, country_code, area) values
  ('es-formigal', 'Formigal', 'es',
   extensions.ST_Multi(extensions.ST_GeomFromText('POLYGON((-0.42 42.76,-0.34 42.76,-0.34 42.8,-0.42 42.8,-0.42 42.76))', 4326))),
  ('es-baqueira-beret', 'Baqueira Beret', 'es',
   extensions.ST_GeomFromText('MULTIPOLYGON(((0.9 42.68,0.98 42.68,0.98 42.72,0.9 42.72,0.9 42.68)),((1.0 42.7,1.04 42.7,1.04 42.73,1.0 42.73,1.0 42.7)))', 4326));

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
