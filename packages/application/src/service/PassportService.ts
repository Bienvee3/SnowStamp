import {
  Passport,
  PassportRepository,
  ResortCatalog,
  ResortKey,
  StampNotFoundError,
  UnknownResortError,
  VisitDate,
  calculateVisitedProgress,
} from "@snowstamp/domain";
import { PassportDto, VisitedProgressDto } from "../dto/Dtos.js";

export interface StampResortCommand {
  readonly ownerId: string;
  readonly resort: string;
  readonly visitedOn?: string;
}

export class PassportService {
  constructor(
    private readonly passports: PassportRepository,
    private readonly catalog: ResortCatalog,
  ) {}

  /** Command. Looks up the catalog first, then loads and saves the passport. */
  async stampResort(command: StampResortCommand): Promise<PassportDto> {
    const key = ResortKey.of(command.resort);
    const visitedOn = command.visitedOn === undefined ? null : VisitDate.of(command.visitedOn);
    await this.requireInCatalog(key);

    const passport = (await this.passports.findByOwner(command.ownerId)) ?? Passport.open(command.ownerId);
    passport.stamp(key, visitedOn);
    await this.passports.save(passport);
    return PassportDto.from(passport);
  }

  /** Command. */
  async unstampResort(ownerId: string, resort: string): Promise<PassportDto> {
    const passport = await this.passports.findByOwner(ownerId);
    if (passport === null) {
      throw new StampNotFoundError(`Resort not stamped: ${resort}`);
    }
    passport.unstamp(ResortKey.of(resort));
    await this.passports.save(passport);
    return PassportDto.from(passport);
  }

  /** Query. A user without a passport has an empty one. */
  async getPassport(ownerId: string): Promise<PassportDto> {
    const passport = (await this.passports.findByOwner(ownerId)) ?? Passport.open(ownerId);
    return PassportDto.from(passport);
  }

  /** Query: visited percentage per country, continent and world. */
  async getProgress(ownerId: string): Promise<VisitedProgressDto> {
    const [resorts, countries, passport] = await Promise.all([
      this.catalog.resorts(),
      this.catalog.countries(),
      this.passports.findByOwner(ownerId),
    ]);
    const visited = (passport?.stamps() ?? []).map((s) => s.resort);
    return VisitedProgressDto.from(calculateVisitedProgress(resorts, countries, visited));
  }

  private async requireInCatalog(key: ResortKey): Promise<void> {
    const resorts = await this.catalog.resorts();
    if (!resorts.some((r) => r.key.equals(key))) {
      throw new UnknownResortError(`Resort not in catalog: ${key.value}`);
    }
  }
}
