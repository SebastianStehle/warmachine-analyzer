import { ApiProperty } from '@nestjs/swagger';
import { CasterStats, FactionDetails, FactionStats, MatchupStats, UnitStats } from 'src/domain/statistics';
import { RecordDto } from '../shared';

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
    description: 'The number of lists with this caster.',
    required: true,
  })
  lists: number;

  static fromDomain(source: CasterStats) {
    const result = new CasterStatsDto();
    const { caster, lists } = source;
    Object.assign(result, { caster, lists });
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

  static fromDomain(source: UnitStats) {
    const result = new UnitStatsDto();
    const { name, lists, copies, averagePoints } = source;
    Object.assign(result, { name, lists, copies, averagePoints });
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

  static fromDomain({ stats, casters, units, matchups }: FactionDetails) {
    const result = new FactionDetailsDto();
    result.stats = FactionStatsDto.fromDomain(stats);
    result.casters = casters.map(CasterStatsDto.fromDomain);
    result.units = units.map(UnitStatsDto.fromDomain);
    result.matchups = matchups.map(MatchupStatsDto.fromDomain);
    return result;
  }
}
