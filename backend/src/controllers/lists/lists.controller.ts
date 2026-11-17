import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { GetCastersQuery, GetListQuery, GetListsQuery, GetPointLevelsQuery } from 'src/domain/lists';
import { DateRangeQueryDto } from '../shared';
import { CasterOptionsDto, CastersQueryDto, ListDetailsDto, ListsDto, ListsQueryDto, PointLevelOptionsDto } from './dtos';

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

  @Get(':id')
  @ApiOperation({ operationId: 'getList', description: 'Gets a list with entries and games.' })
  @ApiParam({ name: 'id', description: 'The ID of the list.', required: true, type: 'number' })
  @ApiOkResponse({ type: ListDetailsDto })
  async getList(@Param('id', ParseIntPipe) id: number) {
    const { list } = await this.queryBus.execute(new GetListQuery(id));

    return ListDetailsDto.fromDomain(list);
  }
}
