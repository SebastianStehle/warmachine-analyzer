import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PageRequest, toSearchPattern, toSqlOrder } from 'src/domain/common/query';
import {
  ArmyEntity,
  ArmyListEntity,
  EventEntity,
  FactionEntity,
  GamePlayerEntity,
  ListEntryEntity,
  ModelEntity,
  ParticipantEntity,
  PlayerEntity,
  ShopProductEntity,
} from 'src/domain/database';
import { applyDateRange } from 'src/domain/statistics/utils';
import { ListFilter, ListSortField, ListSummary } from '../interfaces';

const SORT_COLUMNS: Record<ListSortField, string> = {
  date: 'e.date',
  event: 'e.name',
  player: 'pl.name',
  rank: 'p.rank',
  army: 'a.name',
  caster: 'c.name',
  points: 'l.pointLevel',
  price: 'l.price',
};

export class GetListsQuery extends Query<GetListsResult> {
  constructor(public readonly filter: ListFilter) {
    super();
  }
}

export class GetListsResult {
  constructor(
    public readonly items: ListSummary[],
    public readonly total: number,
  ) {}
}

export interface ListRow {
  id: number;
  title: string;
  faction: string | null;
  army: string;
  caster: string | null;
  pointLevel: number | null;
  totalPoints: number | null;
  price: number | null;
  eventId: number;
  eventName: string;
  eventDate: string;
  eventPlayers: number;
  playerId: number;
  playerName: string;
  rank: number | null;
  eventWins: number | null;
  eventLosses: number | null;
}

export function createListQuery(dataSource: DataSource) {
  return dataSource
    .getRepository(ArmyListEntity)
    .createQueryBuilder('l')
    .innerJoin(EventEntity, 'e', 'e.id = l.eventId')
    .innerJoin(PlayerEntity, 'pl', 'pl.id = l.playerId')
    .innerJoin(ArmyEntity, 'a', 'a.id = l.armyId')
    .leftJoin(FactionEntity, 'f', 'f.id = a.factionId')
    .leftJoin(ModelEntity, 'c', 'c.id = l.casterId')
    .leftJoin(ParticipantEntity, 'p', 'p.eventId = l.eventId AND p.playerId = l.playerId')
    .select('l.id', 'id')
    .addSelect('l.title', 'title')
    .addSelect('f.name', 'faction')
    .addSelect('a.name', 'army')
    .addSelect('c.name', 'caster')
    .addSelect('l.pointLevel', 'pointLevel')
    .addSelect('l.totalPoints', 'totalPoints')
    .addSelect('l.price', 'price')
    .addSelect('e.id', 'eventId')
    .addSelect('e.name', 'eventName')
    .addSelect('e.date', 'eventDate')
    .addSelect('e.playerCount', 'eventPlayers')
    .addSelect('pl.id', 'playerId')
    .addSelect('pl.name', 'playerName')
    .addSelect('p.rank', 'rank')
    .addSelect('p.wins', 'eventWins')
    .addSelect('p.losses', 'eventLosses');
}

export async function loadListRecords(dataSource: DataSource, listIds: number[]) {
  const result = new Map<number, { games: number; wins: number }>();
  if (listIds.length === 0) {
    return result;
  }

  const rows = await dataSource
    .getRepository(GamePlayerEntity)
    .createQueryBuilder('gp')
    .select('gp.listId', 'listId')
    .addSelect('COUNT(*)', 'games')
    .addSelect(`SUM(CASE WHEN gp.result = 'win' THEN 1 ELSE 0 END)`, 'wins')
    .where('gp.listId IN (:...listIds)', { listIds })
    .andWhere('gp.opponentId IS NOT NULL')
    .groupBy('gp.listId')
    .getRawMany<{ listId: number; games: string; wins: string }>();

  for (const { listId, games, wins } of rows) {
    result.set(Number(listId), { games: Number(games), wins: Number(wins) });
  }

  return result;
}

export const toNullableNumber = (value: unknown) => (value === null || value === undefined ? null : Number(value));

// All products are imported with the same currency.
export async function loadCurrency(dataSource: DataSource) {
  const [product] = await dataSource.getRepository(ShopProductEntity).find({ select: { currency: true }, take: 1 });
  return product?.currency ?? null;
}

export function toListSummary(
  row: ListRow,
  records: Map<number, { games: number; wins: number }>,
  currency: string | null,
): ListSummary {
  const id = Number(row.id);

  return {
    id,
    title: row.title,
    faction: row.faction,
    army: row.army,
    caster: row.caster,
    pointLevel: toNullableNumber(row.pointLevel),
    totalPoints: toNullableNumber(row.totalPoints),
    price: toNullableNumber(row.price),
    currency,
    eventId: Number(row.eventId),
    eventName: row.eventName,
    eventDate: row.eventDate,
    eventPlayers: Number(row.eventPlayers),
    playerId: Number(row.playerId),
    playerName: row.playerName,
    rank: toNullableNumber(row.rank),
    eventWins: toNullableNumber(row.eventWins),
    eventLosses: toNullableNumber(row.eventLosses),
    games: records.get(id)?.games ?? 0,
    wins: records.get(id)?.wins ?? 0,
  };
}

export function createFilteredListQuery(dataSource: DataSource, filter: Omit<ListFilter, keyof PageRequest | 'sort' | 'order'>) {
  const { army, caster, pointLevel, maxRank, unit, playerId, eventId, search } = filter;

  const query = applyDateRange(createListQuery(dataSource), 'e', filter);

  if (army && army.length > 0) {
    query.andWhere('a.name IN (:...army)', { army });
  }

  if (caster && caster.length > 0) {
    query.andWhere('c.name IN (:...caster)', { caster });
  }

  if (pointLevel && pointLevel.length > 0) {
    query.andWhere('l.pointLevel IN (:...pointLevel)', { pointLevel });
  }

  if (maxRank) {
    query.andWhere('p.rank <= :maxRank', { maxRank });
  }

  if (playerId) {
    query.andWhere('l.playerId = :playerId', { playerId });
  }

  if (eventId) {
    query.andWhere('l.eventId = :eventId', { eventId });
  }

  if (search) {
    query.andWhere(
      '(LOWER(l.title) LIKE :search OR LOWER(c.name) LIKE :search OR LOWER(pl.name) LIKE :search OR LOWER(e.name) LIKE :search)',
      { search: toSearchPattern(search) },
    );
  }

  // The stats show the name of the matched model, lists often spell it differently, e.g. "Radiance Of Morrow".
  if (unit) {
    const withUnit = dataSource
      .getRepository(ListEntryEntity)
      .createQueryBuilder('le')
      .leftJoin(ModelEntity, 'um', 'um.id = le.modelId')
      .select('le.listId')
      .where('(um.name = :unit OR le.baseName = :unit)');

    query.andWhere(`l.id IN (${withUnit.getQuery()})`, { unit });
  }

  return query;
}

@QueryHandler(GetListsQuery)
export class GetListsHandler implements IQueryHandler<GetListsQuery, GetListsResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute({ filter }: GetListsQuery): Promise<GetListsResult> {
    const { sort, order, page, pageSize } = filter;

    const query = createFilteredListQuery(this.dataSource, filter);

    const total = await query.getCount();

    const rows = await query
      .orderBy(SORT_COLUMNS[sort ?? 'date'], toSqlOrder(order, sort && sort !== 'date' ? 'asc' : 'desc'))
      .addOrderBy('e.date', 'DESC')
      .addOrderBy('p.rank', 'ASC')
      .addOrderBy('l.id', 'ASC')
      .offset(page * pageSize)
      .limit(pageSize)
      .getRawMany<ListRow>();

    const currency = await loadCurrency(this.dataSource);
    const records = await loadListRecords(
      this.dataSource,
      rows.map(({ id }) => Number(id)),
    );

    return new GetListsResult(
      rows.map((row) => toListSummary(row, records, currency)),
      total,
    );
  }
}
