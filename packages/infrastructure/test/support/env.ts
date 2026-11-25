import { createHmac } from "node:crypto";
import { PostgrestClient } from "@supabase/postgrest-js";
import pg from "pg";

export const DATABASE_URL = process.env["IT_DATABASE_URL"] ?? "postgres://postgres:pw@localhost:54329/snowstamp_test";
export const POSTGREST_URL = process.env["IT_POSTGREST_URL"] ?? "http://localhost:54330";
export const JWT_SECRET = process.env["IT_JWT_SECRET"] ?? "test-secret-test-secret-test-secret-123456";

export const ANA = "00000000-0000-0000-0000-0000000000a1";
export const LEO = "00000000-0000-0000-0000-0000000000b2";
export const ZOE = "00000000-0000-0000-0000-0000000000c3";

const base64Url = (value: string | Buffer): string => Buffer.from(value).toString("base64url");

export function signJwt(sub: string, secret: string = JWT_SECRET): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({ role: "authenticated", sub, exp: Math.floor(Date.now() / 1000) + 3600 }),
  );
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest();
  return `${header}.${payload}.${base64Url(signature)}`;
}

/** A PostgREST client acting as the given user. */
export function clientFor(sub: string, secret?: string): PostgrestClient {
  return new PostgrestClient(POSTGREST_URL, { headers: { Authorization: `Bearer ${signJwt(sub, secret)}` } });
}

/** Resets the test data with the database owner's rights (bypasses RLS) and seeds the catalog and users. */
export async function resetAndSeed(): Promise<pg.Client> {
  const db = new pg.Client({ connectionString: DATABASE_URL });
  await db.connect();
  await db.query("truncate public.stamps, public.friendships, public.resorts, public.countries, auth.users cascade");
  await db.query("insert into auth.users (id) values ($1), ($2), ($3)", [ANA, LEO, ZOE]);
  await db.query(
    "insert into public.countries (code, name, continent) values ('es','Spain','europe'), ('ad','Andorra','europe'), ('cl','Chile','south-america')",
  );
  await db.query(`
    insert into public.resorts (key, name, country_code, area) values
    ('es-formigal','Formigal','es', extensions.ST_Multi(extensions.ST_GeomFromText('POLYGON((-0.42 42.76,-0.34 42.76,-0.34 42.8,-0.42 42.8,-0.42 42.76))',4326))),
    ('es-baqueira-beret','Baqueira Beret','es', extensions.ST_GeomFromText('MULTIPOLYGON(((0.9 42.68,0.98 42.68,0.98 42.72,0.9 42.72,0.9 42.68)),((1.0 42.7,1.04 42.7,1.04 42.73,1.0 42.73,1.0 42.7)))',4326)),
    ('ad-grandvalira','Grandvalira','ad', extensions.ST_Multi(extensions.ST_GeomFromText('POLYGON((1.6 42.52,1.74 42.52,1.74 42.58,1.6 42.58,1.6 42.52))',4326))),
    ('cl-portillo','Portillo','cl', extensions.ST_Multi(extensions.ST_GeomFromText('POLYGON((-70.15 -32.87,-70.1 -32.87,-70.1 -32.82,-70.15 -32.82,-70.15 -32.87))',4326)))
  `);
  return db;
}
