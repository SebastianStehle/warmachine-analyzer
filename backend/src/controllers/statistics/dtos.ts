import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ModelType } from 'src/domain/database';
import {
  CasterArmyStats,
  CasterDetails,
  CasterStats,
  FactionDetails,
  FactionStats,
  MatchupCell,
  MatchupGroup,
  MatchupGrouping,
  MatchupMatrix,
  MatchupStats,
  OpponentCasterStats,
  UnitStats,
} from 'src/domain/statistics';

export const MODEL_TYPES: ModelType[] = [
  'leader',
  'warjack',
  'warbeast',
  'battle-engine',
  'solo',
  'unit',
  'attachment',
  'structure',
];
import { DateRangeQueryDto, RecordDto } from '../shared';

export class FactionStatsDto extends RecordDto {
  @ApiProperty({
    description: 'The army as named by Longshanks, e.g. House Kallyss.',
    required: true,
  })
  army: string;

  @ApiProperty({
    description: 'The parent faction from the list header, e.g. Dusk.',
    required: true,
    nullable: true,
    type: String,
  })
  faction: string | null;

  @ApiProperty({
    description: 'The number of event participations.',
    required: true,
  })
  players: number;

  @ApiProperty({
    description: 'The number of submitted lists.',
    required: true,
  })
  lists: number;

  @ApiProperty({
    description: 'The number of mirror matches.',
    required: true,
  })
  mirrors: number;

  static fromDomain(source: FactionStats) {
    const result = new FactionStatsDto();
    const { army, faction, players, lists, mirrors } = source;
    Object.assign(result, { army, faction, players, lists, mirrors });
    RecordDto.assignRecord(result, source);
    return result;
  }
}

export class FactionStatsListDto {
  @ApiProperty({
    description: 'The stats per army.',
    required: true,
    type: [FactionStatsDto],
  })
  items: FactionStatsDto[];

  static fromDomain(source: FactionStats[]) {
    const result = new FactionStatsListDto();
    result.items = source.map(FactionStatsDto.fromDomain);
    return result;
  }
}

export class CasterStatsDto extends RecordDto {
  @ApiProperty({
    description: 'The name of the caster.',
    required: true,
  })
  caster: string;

  @ApiProperty({
    description: 'The page of the caster in the wiki.',
    required: true,
    nullable: true,
    type: String,
  })
  wikiPage: string | null;

  @ApiProperty({
    description: 'The number of lists with this caster.',
    required: true,
  })
  lists: number;

  static fromDomain(source: CasterStats) {
    const result = new CasterStatsDto();
    const { caster, wikiPage, lists } = source;
    Object.assign(result, { caster, wikiPage, lists });
    RecordDto.assignRecord(result, source);
    return result;
  }
}

export class UnitStatsDto extends RecordDto {
  @ApiProperty({
    description: 'The name of the model or unit.',
    required: true,
  })
  name: string;

  @ApiProperty({
    description: 'The type from the wiki, null when the model is not in the wiki.',
    required: true,
    nullable: true,
    enum: MODEL_TYPES,
    enumName: 'ModelType',
  })
  type: ModelType | null;

  @ApiProperty({
    description: 'The page of the model in the wiki.',
    required: true,
    nullable: true,
    type: String,
  })
  wikiPage: string | null;

  @ApiProperty({
    description: 'The number of lists containing it.',
    required: true,
  })
  lists: number;

  @ApiProperty({
    description: 'The number of copies over all lists.',
    required: true,
  })
  copies: number;

  @ApiProperty({
    description: 'The average points cost.',
    required: true,
    nullable: true,
    type: Number,
  })
  averagePoints: number | null;

  @ApiProperty({
    description: 'The number of games with a known list that did not contain it.',
    required: true,
  })
  gamesWithout: number;

  @ApiProperty({
    description: 'The win rate of games with a known list that did not contain it.',
    required: true,
    nullable: true,
    type: Number,
  })
  winRateWithout: number | null;

  @ApiProperty({
    description: 'The win rate with it minus the win rate without it.',
    required: true,
    nullable: true,
    type: Number,
  })
  impact: number | null;

  static fromDomain(source: UnitStats) {
    const result = new UnitStatsDto();
    const { name, type, wikiPage, lists, copies, averagePoints, gamesWithout, winRateWithout, impact } = source;
    Object.assign(result, { name, type, wikiPage, lists, copies, averagePoints, gamesWithout, winRateWithout, impact });
    RecordDto.assignRecord(result, source);
    return result;
  }
}

export class MatchupStatsDto extends RecordDto {
  @ApiProperty({
    description: 'The opposing army.',
    required: true,
  })
  opponent: string;

  static fromDomain(source: MatchupStats) {
    const result = new MatchupStatsDto();
    result.opponent = source.opponent;
    RecordDto.assignRecord(result, source);
    return result;
  }
}

export class FactionDetailsDto {
  @ApiProperty({
    description: 'The overall stats of the army.',
    required: true,
  })
  stats: FactionStatsDto;

  @ApiProperty({
    description: 'The record of the games with a known list, the base of the model impact.',
    required: true,
  })
  knownListRecord: RecordDto;

  @ApiProperty({
    description: 'The stats per caster.',
    required: true,
    type: [CasterStatsDto],
  })
  casters: CasterStatsDto[];

  @ApiProperty({
    description: 'The stats per model or unit.',
    required: true,
    type: [UnitStatsDto],
  })
  units: UnitStatsDto[];

  @ApiProperty({
    description: 'The stats per opposing army.',
    required: true,
    type: [MatchupStatsDto],
  })
  matchups: MatchupStatsDto[];

  static fromDomain({ stats, knownListRecord, casters, units, matchups }: FactionDetails) {
    const result = new FactionDetailsDto();
    result.stats = FactionStatsDto.fromDomain(stats);
    result.knownListRecord = RecordDto.fromDomain(knownListRecord);
    result.casters = casters.map(CasterStatsDto.fromDomain);
    result.units = units.map(UnitStatsDto.fromDomain);
    result.matchups = matchups.map(MatchupStatsDto.fromDomain);
    return result;
  }
}

export const MATCHUP_GROUPINGS: Record<MatchupGrouping, MatchupGrouping> = { faction: 'faction', army: 'army' };

export class MatchupsQueryDto extends DateRangeQueryDto {
  @ApiProperty({
    description: 'Whether to compare factions or armies.',
    required: false,
    enum: MATCHUP_GROUPINGS,
    enumName: 'MatchupGrouping',
  })
  @IsOptional()
  @IsEnum(MATCHUP_GROUPINGS)
  grouping?: MatchupGrouping;
}

export class MatchupGroupDto extends RecordDto {
  @ApiProperty({
    description: 'The faction or army.',
    required: true,
  })
  name: string;

  @ApiProperty({
    description: 'The parent faction.',
    required: true,
    nullable: true,
    type: String,
  })
  faction: string | null;

  static fromDomain(source: MatchupGroup) {
    const result = new MatchupGroupDto();
    const { name, faction } = source;
    Object.assign(result, { name, faction });
    RecordDto.assignRecord(result, source);
    return result;
  }
}

export class MatchupCellDto extends RecordDto {
  @ApiProperty({
    description: 'The faction or army whose games are counted.',
    required: true,
  })
  group: string;

  @ApiProperty({
    description: 'The opposing faction or army.',
    required: true,
  })
  opponent: string;

  static fromDomain(source: MatchupCell) {
    const result = new MatchupCellDto();
    const { group, opponent } = source;
    Object.assign(result, { group, opponent });
    RecordDto.assignRecord(result, source);
    return result;
  }
}

export class MatchupMatrixDto {
  @ApiProperty({
    description: 'The factions or armies with games, most games first.',
    required: true,
    type: [MatchupGroupDto],
  })
  groups: MatchupGroupDto[];

  @ApiProperty({
    description: 'The record of a group against an opponent, only pairs with games.',
    required: true,
    type: [MatchupCellDto],
  })
  cells: MatchupCellDto[];

  static fromDomain({ groups, cells }: MatchupMatrix) {
    const result = new MatchupMatrixDto();
    result.groups = groups.map(MatchupGroupDto.fromDomain);
    result.cells = cells.map(MatchupCellDto.fromDomain);
    return result;
  }
}

export class CasterArmyStatsDto extends RecordDto {
  @ApiProperty({
    description: 'The army the caster was played in.',
    required: true,
  })
  army: string;

  @ApiProperty({
    description: 'The parent faction.',
    required: true,
    nullable: true,
    type: String,
  })
  faction: string | null;

  @ApiProperty({
    description: 'The number of lists of the caster in this army.',
    required: true,
  })
  lists: number;

  static fromDomain(source: CasterArmyStats) {
    const result = new CasterArmyStatsDto();
    const { army, faction, lists } = source;
    Object.assign(result, { army, faction, lists });
    RecordDto.assignRecord(result, source);
    return result;
  }
}

export class OpponentCasterStatsDto extends RecordDto {
  @ApiProperty({
    description: 'The opposing caster.',
    required: true,
  })
  caster: string;

  static fromDomain(source: OpponentCasterStats) {
    const result = new OpponentCasterStatsDto();
    result.caster = source.caster;
    RecordDto.assignRecord(result, source);
    return result;
  }
}

export class CasterDetailsDto {
  @ApiProperty({
    description: 'The name of the caster.',
    required: true,
  })
  caster: string;

  @ApiProperty({
    description: 'The page of the caster in the wiki.',
    required: true,
    nullable: true,
    type: String,
  })
  wikiPage: string | null;

  @ApiProperty({
    description: 'The image of the caster.',
    required: true,
    nullable: true,
    type: String,
  })
  imageUrl: string | null;

  @ApiProperty({
    description: 'The number of lists with this caster.',
    required: true,
  })
  lists: number;

  @ApiProperty({
    description: 'The record over all armies.',
    required: true,
  })
  stats: RecordDto;

  @ApiProperty({
    description: 'The record of the games with a known list, the base of the model impact.',
    required: true,
  })
  knownListRecord: RecordDto;

  @ApiProperty({
    description: 'The stats per army.',
    required: true,
    type: [CasterArmyStatsDto],
  })
  armies: CasterArmyStatsDto[];

  @ApiProperty({
    description: 'The stats per model or unit in the lists of the caster.',
    required: true,
    type: [UnitStatsDto],
  })
  units: UnitStatsDto[];

  @ApiProperty({
    description: 'The stats per opposing army.',
    required: true,
    type: [MatchupStatsDto],
  })
  matchups: MatchupStatsDto[];

  @ApiProperty({
    description: 'The stats per opposing caster.',
    required: true,
    type: [OpponentCasterStatsDto],
  })
  opponentCasters: OpponentCasterStatsDto[];

  static fromDomain({
    caster,
    wikiPage,
    imageUrl,
    lists,
    stats,
    knownListRecord,
    armies,
    units,
    matchups,
    opponentCasters,
  }: CasterDetails) {
    const result = new CasterDetailsDto();
    Object.assign(result, { caster, wikiPage, imageUrl, lists });
    result.stats = RecordDto.fromDomain(stats);
    result.knownListRecord = RecordDto.fromDomain(knownListRecord);
    result.armies = armies.map(CasterArmyStatsDto.fromDomain);
    result.units = units.map(UnitStatsDto.fromDomain);
    result.matchups = matchups.map(MatchupStatsDto.fromDomain);
    result.opponentCasters = opponentCasters.map(OpponentCasterStatsDto.fromDomain);
    return result;
  }
}
