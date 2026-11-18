import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  GetCastersQuery,
  GetListPricesQuery,
  GetListQuery,
  GetListsQuery,
  GetPlayableListsQuery,
  GetPointLevelsQuery,
  GetUnmatchedEntriesQuery,
} from 'src/domain/lists';
import { DateRangeQueryDto } from '../shared';
import {
  CasterOptionsDto,
  CastersQueryDto,
  ListDetailsDto,
  ListPricesDto,
  ListPricesRequestDto,
  ListsDto,
  ListsQueryDto,
  PlayableListsDto,
  PlayableListsRequestDto,
  PointLevelOptionsDto,
  UnmatchedEntriesDto,
} from './dtos';

@Controller('api/lists')
@ApiTags('lists')
export class ListsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('')
  @ApiOperation({ operationId: 'getLists', description: 'Gets lists, newest first.' })
  @ApiOkResponse({ type: ListsDto })
  async getLists(@Query() query: ListsQueryDto) {
    const { items, total } = await this.queryBus.execute(new GetListsQuery(query));

    return ListsDto.fromDomain(items, total);
  }

  @Get('casters')
  @ApiOperation({ operationId: 'getCasters', description: 'Gets the casters of the lists.' })
  @ApiOkResponse({ type: CasterOptionsDto })
  async getCasters(@Query() { army, from, to }: CastersQueryDto) {
    const { casters } = await this.queryBus.execute(new GetCastersQuery(army, { from, to }));

    return CasterOptionsDto.fromDomain(casters);
  }

  @Get('point-levels')
  @ApiOperation({ operationId: 'getPointLevels', description: 'Gets the point levels of the lists.' })
  @ApiOkResponse({ type: PointLevelOptionsDto })
  async getPointLevels(@Query() { from, to }: DateRangeQueryDto) {
    const { pointLevels } = await this.queryBus.execute(new GetPointLevelsQuery({ from, to }));

    return PointLevelOptionsDto.fromDomain(pointLevels);
  }

  @Post('prices')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'getListPrices',
    description: 'Calculates the prices of lists without the products that are already owned.',
  })
  @ApiOkResponse({ type: ListPricesDto })
  async getListPrices(@Body() { listIds, owned }: ListPricesRequestDto) {
    const { prices, currency } = await this.queryBus.execute(new GetListPricesQuery(listIds, owned));

    return ListPricesDto.fromDomain(prices, currency);
  }

  @Post('playable')
  @HttpCode(200)
  @ApiOperation({ operationId: 'getPlayableLists', description: 'Gets lists, fewest models missing in the collection first.' })
  @ApiOkResponse({ type: PlayableListsDto })
  async getPlayableLists(@Body() { owned, ...filter }: PlayableListsRequestDto) {
    const { items, total, playable } = await this.queryBus.execute(new GetPlayableListsQuery(filter, owned));

    return PlayableListsDto.fromDomain(items, total, playable);
  }

  @Get('unmatched')
  @ApiOperation({ operationId: 'getUnmatchedEntries', description: 'Gets list entries that match no model of the catalog.' })
  @ApiOkResponse({ type: UnmatchedEntriesDto })
  async getUnmatchedEntries(@Query() { from, to }: DateRangeQueryDto) {
    const { entries } = await this.queryBus.execute(new GetUnmatchedEntriesQuery({ from, to }));

    return UnmatchedEntriesDto.fromDomain(entries);
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getList', description: 'Gets a list with entries and games.' })
  @ApiParam({ name: 'id', description: 'The ID of the list.', required: true, type: 'number' })
  @ApiOkResponse({ type: ListDetailsDto })
  async getList(@Param('id', ParseIntPipe) id: number) {
    const { list } = await this.queryBus.execute(new GetListQuery(id));

    return ListDetailsDto.fromDomain(list);
  }
}
