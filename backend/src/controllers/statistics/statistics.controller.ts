import { Controller, Get, Param, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { GetFactionDetailsQuery, GetFactionStatsQuery } from 'src/domain/statistics';
import { DateRangeQueryDto } from '../shared';
import { FactionDetailsDto, FactionStatsListDto } from './dtos';

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

  @Get('factions/:army')
  @ApiOperation({ operationId: 'getFactionDetails', description: 'Gets casters, units and matchups of an army.' })
  @ApiParam({ name: 'army', description: 'The army as named by Longshanks.', required: true, type: 'string' })
  @ApiOkResponse({ type: FactionDetailsDto })
  async getFactionDetails(@Param('army') army: string, @Query() range: DateRangeQueryDto) {
    const { details } = await this.queryBus.execute(new GetFactionDetailsQuery(army, range));

    return FactionDetailsDto.fromDomain(details);
  }
}
