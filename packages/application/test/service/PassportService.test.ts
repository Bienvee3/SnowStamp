import { beforeEach, describe, expect, it } from "vitest";
import {
  DuplicateStampError,
  InvalidResortKeyError,
  InvalidVisitDateError,
  StampNotFoundError,
  UnknownResortError,
} from "@snowstamp/domain";
import { PassportService } from "../../src/service/PassportService.js";
import { FixedCatalog, InMemoryPassports } from "../support/inMemory.js";

let service: PassportService;

beforeEach(() => {
  service = new PassportService(new InMemoryPassports(), new FixedCatalog());
});

describe("PassportService.stampResort", () => {
  it("creates the passport on the first stamp and persists it", async () => {
    const dto = await service.stampResort({ ownerId: "ana", resort: "es-formigal", visitedOn: "2025-02-01" });

    expect(dto).toEqual({ ownerId: "ana", stamps: [{ resort: "es-formigal", visitedOn: "2025-02-01" }] });
    expect((await service.getPassport("ana")).stamps).toHaveLength(1);
  });

  it("rejects a resort outside the catalog", async () => {
    await expect(service.stampResort({ ownerId: "ana", resort: "fr-chamonix" })).rejects.toThrow(UnknownResortError);
  });

  it("rejects a duplicate stamp, a malformed key and a bad date", async () => {
    await service.stampResort({ ownerId: "ana", resort: "es-formigal" });
    await expect(service.stampResort({ ownerId: "ana", resort: "es-formigal" })).rejects.toThrow(DuplicateStampError);
    await expect(service.stampResort({ ownerId: "ana", resort: "Formigal" })).rejects.toThrow(InvalidResortKeyError);
    await expect(
      service.stampResort({ ownerId: "ana", resort: "ad-grandvalira", visitedOn: "2025-02-30" }),
    ).rejects.toThrow(InvalidVisitDateError);
  });
});

describe("PassportService.unstampResort", () => {
  it("removes an existing stamp", async () => {
    await service.stampResort({ ownerId: "ana", resort: "es-formigal" });
    expect((await service.unstampResort("ana", "es-formigal")).stamps).toEqual([]);
  });

  it("fails when the user has no passport or no such stamp", async () => {
    await expect(service.unstampResort("nobody", "es-formigal")).rejects.toThrow(StampNotFoundError);
    await service.stampResort({ ownerId: "ana", resort: "es-formigal" });
    await expect(service.unstampResort("ana", "ad-grandvalira")).rejects.toThrow(StampNotFoundError);
  });
});

describe("PassportService queries", () => {
  it("returns an empty passport for a new user", async () => {
    expect(await service.getPassport("new")).toEqual({ ownerId: "new", stamps: [] });
  });

  it("reports progress per country, continent and world", async () => {
    await service.stampResort({ ownerId: "ana", resort: "es-formigal" });
    const progress = await service.getProgress("ana");

    expect(progress.byCountry["es"]).toEqual({ visited: 1, total: 2, percentage: 50 });
    expect(progress.byCountry["ad"]).toEqual({ visited: 0, total: 1, percentage: 0 });
    expect(progress.byContinent["europe"]).toMatchObject({ visited: 1, total: 3 });
    expect(progress.world.visited).toBe(1);
  });

  it("reports zero progress for a user without a passport", async () => {
    expect((await service.getProgress("new")).world).toMatchObject({ visited: 0, total: 3, percentage: 0 });
  });
});
