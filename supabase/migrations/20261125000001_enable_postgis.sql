-- Spatial support. Resort areas are stored as planar WGS84 geometry (SRID 4326) so that
-- ST_Covers matches the planar point-in-polygon rule of the TypeScript domain (boundary counts as inside).
create extension if not exists postgis with schema extensions;
