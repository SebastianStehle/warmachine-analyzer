import { DataSource } from 'typeorm';
import {
  ArmyListEntity,
  EventEntity,
  GameEntity,
  GamePlayerEntity,
  GameResult,
  ListEntryEntity,
  ModelEntity,
  ModelType,
} from 'src/domain/database';
import { DateRange, UnitStats } from './interfaces';
import { applyDateRange, createRecord, RecordCounter, RecordRow, selectRecord, toRecord } from './utils';

// Stats are computed either for all lists of an army or for all lists of a caster.
export interface StatsScope {
  column: 'armyId' | 'casterId';
  id: number;
}

// Entries that match a model of the wiki are grouped by the model, others by their name in the list.
const MODEL_NAME = 'COALESCE(m.name, le.baseName)';

const DECIMALS = 10;

// Mirror matches always produce one win and one loss, so they are excluded.
export function createGamesQuery(dataSource: DataSource, { column, id }: StatsScope, range: DateRange) {
  return applyDateRange(
    dataSource
      .getRepository(GamePlayerEntity)
      .createQueryBuilder('gp')
      .innerJoin(GameEntity, 'g', 'g.id = gp.gameId')
      .innerJoin(EventEntity, 'e', 'e.id = g.eventId')
      .where(`gp.${column} = :scopeId`, { scopeId: id })
      .andWhere('gp.opponentId IS NOT NULL')
      .andWhere('gp.opponentArmyId IS NOT NULL')
      .andWhere('gp.armyId <> gp.opponentArmyId'),
    'e',
    range,
  );
}

export async function loadUnitStats(dataSource: DataSource, scope: StatsScope, range: DateRange) {
  const entries = await applyDateRange(
    dataSource
      .getRepository(ListEntryEntity)
      .createQueryBuilder('le')
      .innerJoin(ArmyListEntity, 'l', 'l.id = le.listId')
      .innerJoin(EventEntity, 'e', 'e.id = l.eventId')
      .leftJoin(ModelEntity, 'm', 'm.id = le.modelId')
      .select(MODEL_NAME, 'name')
      .addSelect('MAX(m.type)', 'type')
      .addSelect('MAX(m.wikiPage)', 'wikiPage')
      .addSelect('COUNT(DISTINCT le.listId)', 'lists')
      .addSelect('COUNT(*)', 'copies')
      .addSelect('AVG(le.points)', 'averagePoints')
      .where(`l.${scope.column} = :scopeId`, { scopeId: scope.id })
      .andWhere("le.kind = 'model'")
      .groupBy(MODEL_NAME),
    'e',
    range,
  ).getRawMany<{
    name: string;
    type: ModelType | null;
    wikiPage: string | null;
    lists: string;
    copies: string;
    averagePoints: string | null;
  }>();

  // A list can contain the same unit several times, so the games are made distinct per unit first.
  const games = await createGamesQuery(dataSource, scope, range)
    .innerJoin(ListEntryEntity, 'le', 'le.listId = gp.listId')
    .leftJoin(ModelEntity, 'm', 'm.id = le.modelId')
    .select(MODEL_NAME, 'name')
    .addSelect('gp.id', 'gamePlayerId')
    .addSelect('gp.result', 'result')
    .andWhere("le.kind = 'model'")
    .distinct(true)
    .getRawMany<{ name: string; gamePlayerId: number; result: GameResult }>();

  // The baseline only contains games with a known list, otherwise games without the unit could not be told apart.
  const baselineRow = await selectRecord(
    createGamesQuery(dataSource, scope, range).select('COUNT(*)', 'games').andWhere('gp.listId IS NOT NULL'),
    'gp',
  ).getRawOne<RecordRow>();
  const baseline = toRecord(baselineRow);

  const records = new Map<string, RecordCounter>();
  for (const { name, result } of games) {
    let counter = records.get(name);
    if (!counter) {
      counter = new RecordCounter();
      records.set(name, counter);
    }
    counter.add(result);
  }

  const units: UnitStats[] = entries.map(({ name, type, wikiPage, lists, copies, averagePoints }) => {
    const record = records.get(name)?.toRecord() ?? toRecord();
    const without = createRecord(
      baseline.games - record.games,
      baseline.wins - record.wins,
      baseline.losses - record.losses,
      baseline.draws - record.draws,
    );

    return {
      name,
      type,
      wikiPage,
      lists: Number(lists),
      copies: Number(copies),
      averagePoints: averagePoints !== null ? Math.round(Number(averagePoints) * DECIMALS) / DECIMALS : null,
      ...record,
      gamesWithout: without.games,
      winRateWithout: without.winRate,
      impact: record.winRate !== null && without.winRate !== null ? record.winRate - without.winRate : null,
    };
  });

  return { units, knownListRecord: baseline };
}
