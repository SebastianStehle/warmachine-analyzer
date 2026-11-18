import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, Query, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ArmyEntity, ArmyListEntity, EventEntity, ModelEntity } from 'src/domain/database';
import { CasterArmyStats, CasterDetails, DateRange, MatchupStats, OpponentCasterStats } from '../interfaces';
import { createGamesQuery, loadUnitStats, StatsScope } from '../unit-stats';
import { applyDateRange, byGamesDescending, loadArmyNames, RecordRow, selectRecord, toRecord } from '../utils';

export class GetCasterDetailsQuery extends Query<GetCasterDetailsResult> {
  constructor(
    public readonly caster: string,
    public readonly range: DateRange,
  ) {
    super();
  }
}

export class GetCasterDetailsResult {
  constructor(public readonly details: CasterDetails) {}
}

@QueryHandler(GetCasterDetailsQuery)
export class GetCasterDetailsHandler implements IQueryHandler<GetCasterDetailsQuery, GetCasterDetailsResult> {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute({ caster: name, range }: GetCasterDetailsQuery): Promise<GetCasterDetailsResult> {
    const caster = await this.dataSource.getRepository(ModelEntity).findOneBy({ name, type: 'leader' });
    if (!caster) {
      throw new NotFoundException(`Caster ${name} not found.`);
    }

    const scope: StatsScope = { column: 'casterId', id: caster.id };

    const [stats, armies, { units, knownListRecord }, matchups, opponentCasters] = await Promise.all([
      selectRecord(createGamesQuery(this.dataSource, scope, range).select('COUNT(*)', 'games'), 'gp').getRawOne<RecordRow>(),
      this.loadArmies(scope, range),
      loadUnitStats(this.dataSource, scope, range),
      this.loadMatchups(scope, range),
      this.loadOpponentCasters(scope, range),
    ]);

    let lists = 0;
    for (const army of armies) {
      lists += army.lists;
    }

    return new GetCasterDetailsResult({
      caster: caster.name,
      wikiPage: caster.wikiPage,
      imageUrl: caster.imageUrl,
      lists,
      stats: toRecord(stats),
      knownListRecord,
      armies,
      units: units.sort(byGamesDescending),
      matchups,
      opponentCasters,
    });
  }

  private async loadArmies(scope: StatsScope, range: DateRange) {
    const lists = await applyDateRange(
      this.dataSource
        .getRepository(ArmyListEntity)
        .createQueryBuilder('l')
        .innerJoin(EventEntity, 'e', 'e.id = l.eventId')
        .select('l.armyId', 'armyId')
        .addSelect('COUNT(*)', 'lists')
        .where('l.casterId = :casterId', { casterId: scope.id })
        .groupBy('l.armyId'),
      'e',
      range,
    ).getRawMany<{ armyId: number; lists: string }>();

    const games = await selectRecord(
      createGamesQuery(this.dataSource, scope, range).select('gp.armyId', 'armyId').groupBy('gp.armyId'),
      'gp',
    ).getRawMany<{ armyId: number } & RecordRow>();

    const names = await loadArmyNames(this.dataSource);

    const result = new Map<number, CasterArmyStats>();
    const getOrCreate = (armyId: number) => {
      const id = Number(armyId);
      let stats = result.get(id);
      if (!stats) {
        const { name, faction } = names.get(id)!;
        stats = { army: name, faction, lists: 0, ...toRecord() };
        result.set(id, stats);
      }
      return stats;
    };

    for (const { armyId, lists: count } of lists) {
      getOrCreate(armyId).lists = Number(count);
    }

    for (const row of games) {
      Object.assign(getOrCreate(row.armyId), toRecord(row));
    }

    return [...result.values()].sort(byGamesDescending);
  }

  private async loadMatchups(scope: StatsScope, range: DateRange) {
    const rows = await selectRecord(
      createGamesQuery(this.dataSource, scope, range)
        .innerJoin(ArmyEntity, 'o', 'o.id = gp.opponentArmyId')
        .select('o.name', 'opponent')
        .groupBy('o.name'),
      'gp',
    ).getRawMany<{ opponent: string } & RecordRow>();

    const result: MatchupStats[] = rows.map((row) => ({ opponent: row.opponent, ...toRecord(row) }));

    return result.sort(byGamesDescending);
  }

  private async loadOpponentCasters(scope: StatsScope, range: DateRange) {
    const rows = await selectRecord(
      createGamesQuery(this.dataSource, scope, range)
        .innerJoin(ModelEntity, 'oc', 'oc.id = gp.opponentCasterId')
        .select('oc.name', 'caster')
        .groupBy('oc.name'),
      'gp',
    ).getRawMany<{ caster: string } & RecordRow>();

    const result: OpponentCasterStats[] = rows.map((row) => ({ caster: row.caster, ...toRecord(row) }));

    return result.sort(byGamesDescending);
  }
}
