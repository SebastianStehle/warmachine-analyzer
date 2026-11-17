import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ArmyListEntity, EventEntity, GameEntity, GamePlayerEntity, ParticipantEntity } from 'src/domain/database';
import { DateRange, FactionStats } from '../interfaces';
import { applyDateRange, byGamesDescending, loadArmyNames, RecordRow, selectRecord, toRecord } from '../utils';

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

export async function loadFactionStats(dataSource: DataSource, range: DateRange, armyId?: number) {
  const filterArmy = <T extends { andWhere: (where: string, parameters?: object) => T }>(query: T, column: string) =>
    armyId ? query.andWhere(`${column} = :armyId`, { armyId }) : query;

  const players = await filterArmy(
    applyDateRange(
      dataSource
        .getRepository(ParticipantEntity)
        .createQueryBuilder('p')
        .innerJoin(EventEntity, 'e', 'e.id = p.eventId')
        .select('p.armyId', 'armyId')
        .addSelect('COUNT(*)', 'players')
        .where('p.armyId IS NOT NULL')
        .groupBy('p.armyId'),
      'e',
      range,
    ),
    'p.armyId',
  ).getRawMany<{ armyId: number; players: string }>();

  const lists = await filterArmy(
    applyDateRange(
      dataSource
        .getRepository(ArmyListEntity)
        .createQueryBuilder('l')
        .innerJoin(EventEntity, 'e', 'e.id = l.eventId')
        .select('l.armyId', 'armyId')
        .addSelect('COUNT(*)', 'lists')
        .groupBy('l.armyId'),
      'e',
      range,
    ),
    'l.armyId',
  ).getRawMany<{ armyId: number; lists: string }>();

  // Mirror matches always produce one win and one loss, so they are excluded from the win rate.
  const games = await filterArmy(
    selectRecord(
      applyDateRange(
        dataSource
          .getRepository(GamePlayerEntity)
          .createQueryBuilder('gp')
          .innerJoin(GameEntity, 'g', 'g.id = gp.gameId')
          .innerJoin(EventEntity, 'e', 'e.id = g.eventId')
          .select('gp.armyId', 'armyId')
          .where('gp.armyId IS NOT NULL')
          .andWhere('gp.opponentId IS NOT NULL')
          .andWhere('gp.opponentArmyId IS NOT NULL')
          .andWhere('gp.armyId <> gp.opponentArmyId')
          .groupBy('gp.armyId'),
        'e',
        range,
      ),
      'gp',
    ),
    'gp.armyId',
  ).getRawMany<{ armyId: number } & RecordRow>();

  const mirrors = await filterArmy(
    applyDateRange(
      dataSource
        .getRepository(GamePlayerEntity)
        .createQueryBuilder('gp')
        .innerJoin(GameEntity, 'g', 'g.id = gp.gameId')
        .innerJoin(EventEntity, 'e', 'e.id = g.eventId')
        .select('gp.armyId', 'armyId')
        .addSelect('COUNT(*)', 'mirrors')
        .where('gp.armyId = gp.opponentArmyId')
        .groupBy('gp.armyId'),
      'e',
      range,
    ),
    'gp.armyId',
  ).getRawMany<{ armyId: number; mirrors: string }>();

  // All armies of the catalog are part of the result, also before anything has been crawled.
  const result = new Map<number, FactionStats>();
  for (const [id, { name, faction }] of await loadArmyNames(dataSource)) {
    if (!armyId || id === armyId) {
      result.set(id, { army: name, faction, players: 0, lists: 0, mirrors: 0, ...toRecord() });
    }
  }

  const getOrCreate = (id: number) => result.get(id)!;

  for (const { armyId: id, players: count } of players) {
    getOrCreate(id).players = Number(count);
  }

  for (const { armyId: id, lists: count } of lists) {
    getOrCreate(id).lists = Number(count);
  }

  for (const row of games) {
    Object.assign(getOrCreate(row.armyId), toRecord(row));
  }

  for (const { armyId: id, mirrors: count } of mirrors) {
    getOrCreate(id).mirrors = Number(count) / 2;
  }

  return [...result.values()].sort((a, b) => b.players - a.players || byGamesDescending(a, b) || a.army.localeCompare(b.army));
}
