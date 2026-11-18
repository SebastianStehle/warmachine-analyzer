import { Controller, Get, Param, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { GetCasterDetailsQuery, GetFactionDetailsQuery, GetFactionStatsQuery, GetMatchupsQuery } from 'src/domain/statistics';
import { DateRangeQueryDto } from '../shared';
import { CasterDetailsDto, FactionDetailsDto, FactionStatsListDto, MatchupMatrixDto, MatchupsQueryDto } from './dtos';

@Controller('api/stats')
@ApiTags('stats')
export class StatisticsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('factions')
  @ApiOperation({ operationId: 'getFactionStats', description: 'Gets stats per army.' })
  @ApiOkResponse({ type: FactionStatsListDto })
  async getFactionStats(@Query() range: DateRangeQueryDto) {
    const { factions } = await this.queryBus.execute(new GetFactionStatsQuery(range));

    return FactionStatsListDto.fromDomain(factions);
  }

  @Get('matchups')
  @ApiOperation({ operationId: 'getMatchups', description: 'Gets the matchup matrix of factions or armies.' })
  @ApiOkResponse({ type: MatchupMatrixDto })
  async getMatchups(@Query() { grouping, from, to }: MatchupsQueryDto) {
    const { matrix } = await this.queryBus.execute(new GetMatchupsQuery(grouping ?? 'faction', { from, to }));

    return MatchupMatrixDto.fromDomain(matrix);
  }

  @Get('casters/:caster')
  @ApiOperation({ operationId: 'getCasterDetails', description: 'Gets armies, models and matchups of a caster.' })
  @ApiParam({ name: 'caster', description: 'The name of the caster.', required: true, type: 'string' })
  @ApiOkResponse({ type: CasterDetailsDto })
  async getCasterDetails(@Param('caster') caster: string, @Query() range: DateRangeQueryDto) {
    const { details } = await this.queryBus.execute(new GetCasterDetailsQuery(caster, range));

    return CasterDetailsDto.fromDomain(details);
  }

  @Get('factions/:army')
  @ApiOperation({ operationId: 'getFactionDetails', description: 'Gets casters, units and matchups of an army.' })
  @ApiParam({ name: 'army', description: 'The army as named by Longshanks.', required: true, type: 'string' })
  @ApiOkResponse({ type: FactionDetailsDto })
  async getFactionDetails(@Param('army') army: string, @Query() range: DateRangeQueryDto) {
    const { details } = await this.queryBus.execute(new GetFactionDetailsQuery(army, range));

    return FactionDetailsDto.fromDomain(details);
  }
}
