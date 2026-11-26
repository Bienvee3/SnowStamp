-- Stamps are chosen manually (country, then resort); no GPS membership lookup is needed.
drop function if exists public.resorts_covering(double precision, double precision);
