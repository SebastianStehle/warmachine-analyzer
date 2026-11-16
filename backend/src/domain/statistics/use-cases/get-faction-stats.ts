import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ArmyListEntity, EventEntity, GamePlayerEntity, ParticipantEntity } from 'src/domain/database';
import { DateRange, FactionStats } from '../interfaces';
import { applyDateRange, byGamesDescending, selectRecord, toRecord } from '../utils';

export class GetFactionStatsQuery extends Query<GetFactionStatsResult> {
  constructor(public readonly range: DateRange) {
    super();
  }
}

export class GetFactionStatsResult {
  constructor(public readonly factions: FactionStats[]) {}
}

@QueryHandler(GetFactionStatsQuery)
export class GetFactionStatsHandler implements IQueryHandler<GetFactionStatsQuery, GetFactionStatsResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute({ range }: GetFactionStatsQuery): Promise<GetFactionStatsResult> {
    return new GetFactionStatsResult(await loadFactionStats(this.dataSource, range));
  }
}

export async function loadFactionStats(dataSource: DataSource, range: DateRange, army?: string) {
  const filterArmy = <T extends { andWhere: (where: string, parameters?: object) => T }>(query: T, column: string) =>
    army ? query.andWhere(`${column} = :army`, { army }) : query;

  const players = await filterArmy(
    applyDateRange(
      dataSource
        .getRepository(ParticipantEntity)
        .createQueryBuilder('p')
        .innerJoin(EventEntity, 'e', 'e.id = p.eventId')
        .select('p.army', 'army')
        .addSelect('p.faction', 'faction')
        .addSelect('COUNT(*)', 'players')
        .where('p.army IS NOT NULL')
        .groupBy('p.army')
        .addGroupBy('p.faction'),
      'e',
      range,
    ),
    'p.army',
  ).getRawMany<{ army: string; faction: string | null; players: string }>();

  const lists = await filterArmy(
    applyDateRange(
      dataSource
        .getRepository(ArmyListEntity)
        .createQueryBuilder('l')
        .innerJoin(EventEntity, 'e', 'e.id = l.eventId')
        .select('l.army', 'army')
        .addSelect('COUNT(*)', 'lists')
        .where('l.army IS NOT NULL')
        .groupBy('l.army'),
      'e',
      range,
    ),
    'l.army',
  ).getRawMany<{ army: string; lists: string }>();

  // Mirror matches always produce one win and one loss, so they are excluded from the win rate.
  const games = await filterArmy(
    selectRecord(
      applyDateRange(
        dataSource
          .getRepository(GamePlayerEntity)
          .createQueryBuilder('gp')
          .innerJoin(EventEntity, 'e', 'e.id = gp.eventId')
          .select('gp.army', 'army')
          .where('gp.army IS NOT NULL')
          .andWhere('gp.opponentId IS NOT NULL')
          .andWhere('gp.opponentArmy IS NOT NULL')
          .andWhere('gp.army <> gp.opponentArmy')
          .groupBy('gp.army'),
        'e',
        range,
      ),
      'gp',
    ),
    'gp.army',
  ).getRawMany();

  const mirrors = await filterArmy(
    applyDateRange(
      dataSource
        .getRepository(GamePlayerEntity)
        .createQueryBuilder('gp')
        .innerJoin(EventEntity, 'e', 'e.id = gp.eventId')
        .select('gp.army', 'army')
        .addSelect('COUNT(*)', 'mirrors')
        .where('gp.army = gp.opponentArmy')
        .groupBy('gp.army'),
      'e',
      range,
    ),
    'gp.army',
  ).getRawMany<{ army: string; mirrors: string }>();

  const result = new Map<string, FactionStats>();
  const factionCounts = new Map<string, number>();

  const getOrCreate = (name: string) => {
    let stats = result.get(name);
    if (!stats) {
      stats = { army: name, faction: null, players: 0, lists: 0, mirrors: 0, ...toRecord() };
      result.set(name, stats);
    }
    return stats;
  };

  for (const { army: name, faction, players: count } of players) {
    const stats = getOrCreate(name);
    stats.players += Number(count);

    // The faction comes from the free text list header, so the most common value wins.
    if (faction && Number(count) > (factionCounts.get(name) ?? 0)) {
      factionCounts.set(name, Number(count));
      stats.faction = faction;
    }
  }

  for (const { army: name, lists: count } of lists) {
    getOrCreate(name).lists = Number(count);
  }

  for (const row of games) {
    Object.assign(getOrCreate(row.army), toRecord(row));
  }

  for (const { army: name, mirrors: count } of mirrors) {
    getOrCreate(name).mirrors = Number(count) / 2;
  }

  return [...result.values()].sort((a, b) => b.players - a.players || byGamesDescending(a, b) || a.army.localeCompare(b.army));
}
