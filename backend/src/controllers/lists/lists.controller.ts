import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { GetListQuery, GetListsQuery } from 'src/domain/lists';
import { ListDetailsDto, ListsDto, ListsQueryDto } from './dtos';

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

  @Get(':id')
  @ApiOperation({ operationId: 'getList', description: 'Gets a list with entries and games.' })
  @ApiParam({ name: 'id', description: 'The ID of the list.', required: true, type: 'number' })
  @ApiOkResponse({ type: ListDetailsDto })
  async getList(@Param('id', ParseIntPipe) id: number) {
    const { list } = await this.queryBus.execute(new GetListQuery(id));

    return ListDetailsDto.fromDomain(list);
  }
}
