import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ArmyListEntity, EventEntity, GamePlayerEntity, GameResult, ListEntryEntity } from 'src/domain/database';
import { isSameCaster } from 'src/domain/lists/parser';
import { CasterStats, DateRange, FactionDetails, MatchupStats, UnitStats } from '../interfaces';
import { applyDateRange, byGamesDescending, RecordCounter, selectRecord, toRecord } from '../utils';
import { loadFactionStats } from './get-faction-stats';

export class GetFactionDetailsQuery extends Query<GetFactionDetailsResult> {
  constructor(
    public readonly army: string,
    public readonly range: DateRange,
  ) {
    super();
  }
}

export class GetFactionDetailsResult {
  constructor(public readonly details: FactionDetails) {}
}

@QueryHandler(GetFactionDetailsQuery)
export class GetFactionDetailsHandler implements IQueryHandler<GetFactionDetailsQuery, GetFactionDetailsResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute({ army, range }: GetFactionDetailsQuery): Promise<GetFactionDetailsResult> {
    const [stats] = await loadFactionStats(this.dataSource, range, army);
    if (!stats) {
      throw new NotFoundException(`No data for army ${army}.`);
    }

    const [casters, units, matchups] = await Promise.all([
      this.loadCasters(army, range),
      this.loadUnits(army, range),
      this.loadMatchups(army, range),
    ]);

    return new GetFactionDetailsResult({ stats, casters, units, matchups });
  }

  private gamesQuery(army: string, range: DateRange) {
    return applyDateRange(
      this.dataSource
        .getRepository(GamePlayerEntity)
        .createQueryBuilder('gp')
        .innerJoin(EventEntity, 'e', 'e.id = gp.eventId')
        .where('gp.army = :army', { army })
        .andWhere('gp.opponentId IS NOT NULL')
        .andWhere('gp.opponentArmy IS NOT NULL')
        .andWhere('gp.army <> gp.opponentArmy'),
      'e',
      range,
    );
  }

  private async loadCasters(army: string, range: DateRange) {
    const lists = await applyDateRange(
      this.dataSource
        .getRepository(ArmyListEntity)
        .createQueryBuilder('l')
        .innerJoin(EventEntity, 'e', 'e.id = l.eventId')
        .select('l.caster', 'caster')
        .addSelect('COUNT(*)', 'lists')
        .where('l.army = :army', { army })
        .andWhere('l.caster IS NOT NULL')
        .groupBy('l.caster'),
      'e',
      range,
    ).getRawMany<{ caster: string; lists: string }>();

    const games = await selectRecord(
      this.gamesQuery(army, range).select('gp.caster', 'caster').andWhere('gp.caster IS NOT NULL').groupBy('gp.caster'),
      'gp',
    ).getRawMany();

    const result: CasterStats[] = [];
    for (const { caster, lists: count } of lists) {
      const existing = result.find((x) => isSameCaster(x.caster, caster));
      if (existing) {
        existing.lists += Number(count);
      } else {
        result.push({ caster, lists: Number(count), ...toRecord() });
      }
    }

    // Longshanks shows the game leader slightly differently than the list text, so names are matched loosely.
    for (const row of games) {
      const existing = result.find((x) => isSameCaster(x.caster, row.caster));
      if (existing) {
        Object.assign(existing, { ...toRecord(row), lists: existing.lists, caster: existing.caster });
      } else {
        result.push({ caster: row.caster, lists: 0, ...toRecord(row) });
      }
    }

    return result.sort(byGamesDescending);
  }

  private async loadUnits(army: string, range: DateRange) {
    const entries = await applyDateRange(
      this.dataSource
        .getRepository(ListEntryEntity)
        .createQueryBuilder('le')
        .innerJoin(ArmyListEntity, 'l', 'l.id = le.listId')
        .innerJoin(EventEntity, 'e', 'e.id = l.eventId')
        .select('le.baseName', 'name')
        .addSelect('COUNT(DISTINCT le.listId)', 'lists')
        .addSelect('COUNT(*)', 'copies')
        .addSelect('AVG(le.points)', 'averagePoints')
        .where('l.army = :army', { army })
        .andWhere("le.kind = 'model'")
        .groupBy('le.baseName'),
      'e',
      range,
    ).getRawMany<{ name: string; lists: string; copies: string; averagePoints: string | null }>();

    // A list can contain the same unit several times, so the games are made distinct per unit first.
    const games = await this.gamesQuery(army, range)
      .innerJoin(ListEntryEntity, 'le', 'le.listId = gp.listId')
      .select('le.baseName', 'name')
      .addSelect('gp.id', 'gamePlayerId')
      .addSelect('gp.result', 'result')
      .andWhere("le.kind = 'model'")
      .distinct(true)
      .getRawMany<{ name: string; gamePlayerId: number; result: GameResult }>();

    const records = new Map<string, RecordCounter>();
    for (const { name, result } of games) {
      let counter = records.get(name);
      if (!counter) {
        counter = new RecordCounter();
        records.set(name, counter);
      }
      counter.add(result);
    }

    const result: UnitStats[] = entries.map(({ name, lists, copies, averagePoints }) => ({
      name,
      lists: Number(lists),
      copies: Number(copies),
      averagePoints: averagePoints !== null ? Math.round(Number(averagePoints) * 10) / 10 : null,
      ...(records.get(name)?.toRecord() ?? toRecord()),
    }));

    return result.sort(byGamesDescending);
  }

  private async loadMatchups(army: string, range: DateRange) {
    const rows = await selectRecord(
      this.gamesQuery(army, range).select('gp.opponentArmy', 'opponent').groupBy('gp.opponentArmy'),
      'gp',
    ).getRawMany();

    const result: MatchupStats[] = rows.map((row) => ({ opponent: row.opponent, ...toRecord(row) }));

    return result.sort(byGamesDescending);
  }
}
