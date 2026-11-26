import type { PostgrestClient } from "@supabase/postgrest-js";
import {
  Continent,
  Coordinate,
  Country,
  CountryCode,
  Polygon,
  ProviderFailureError,
  Resort,
  ResortArea,
  ResortCatalog,
  ResortKey,
} from "@snowstamp/domain";

interface CatalogRow {
  readonly key: string;
  readonly name: string;
  readonly country_code: string;
  readonly area: { readonly type: string; readonly coordinates: number[][][][] };
}

interface CountryRow {
  readonly code: string;
  readonly continent: string;
}

const CONTINENTS = new Set<string>(Object.values(Continent));

function toArea(geojson: CatalogRow["area"]): ResortArea {
  if (geojson.type !== "MultiPolygon") {
    throw new ProviderFailureError(`Expected a MultiPolygon, got ${geojson.type}`);
  }
  const polygons: Polygon[] = geojson.coordinates.map(([outer, ...holes]) => ({
    outer: (outer ?? []).map(([lon, lat]) => Coordinate.of(lon as number, lat as number)),
    holes: holes.map((ring) => ring.map(([lon, lat]) => Coordinate.of(lon as number, lat as number))),
  }));
  return ResortArea.of(polygons);
}

/** Supabase adapter for the read-only resort and country catalog. */
export class SupabaseResortCatalog implements ResortCatalog {
  constructor(private readonly client: PostgrestClient) {}

  async resorts(): Promise<readonly Resort[]> {
    const { data, error } = await this.client.rpc("resort_catalog");
    if (error !== null) {
      throw new ProviderFailureError(`Could not load resorts: ${error.message}`);
    }
    return (data as CatalogRow[]).map((row) => Resort.create(ResortKey.of(row.key), row.name, toArea(row.area)));
  }

  async countries(): Promise<readonly Country[]> {
    const { data, error } = await this.client.from("countries").select("code, continent").order("code");
    if (error !== null) {
      throw new ProviderFailureError(`Could not load countries: ${error.message}`);
    }
    return (data as CountryRow[]).map((row) => {
      if (!CONTINENTS.has(row.continent)) {
        throw new ProviderFailureError(`Unknown continent "${row.continent}" for ${row.code}`);
      }
      return Country.of(CountryCode.of(row.code), row.continent as Continent);
    });
  }
}
