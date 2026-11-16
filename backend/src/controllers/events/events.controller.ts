import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { EventSummary, GetEventsQuery } from 'src/domain/events';
import { PageQueryDto } from '../shared';

export class EventDto {
  @ApiProperty({ description: 'The Longshanks ID of the event.', required: true })
  id: number;

  @ApiProperty({ description: 'The name.', required: true })
  name: string;

  @ApiProperty({ description: 'The date (YYYY-MM-DD).', required: true })
  date: string;

  @ApiProperty({ description: 'The location.', required: true, nullable: true, type: String })
  location: string | null;

  @ApiProperty({ description: 'The event type, e.g. Rated tournament.', required: true, nullable: true, type: String })
  type: string | null;

  @ApiProperty({ description: 'The number of players.', required: true })
  playerCount: number;

  @ApiProperty({ description: 'The number of rounds.', required: true })
  rounds: number;

  @ApiProperty({ description: 'The number of imported lists.', required: true })
  lists: number;

  static fromDomain(source: EventSummary) {
    const result = new EventDto();
    Object.assign(result, source);
    return result;
  }
}

export class EventsDto {
  @ApiProperty({ description: 'The events.', required: true, type: [EventDto] })
  items: EventDto[];

  @ApiProperty({ description: 'The total number of events.', required: true })
  total: number;

  static fromDomain(items: EventSummary[], total: number) {
    const result = new EventsDto();
    result.items = items.map(EventDto.fromDomain);
    result.total = total;
    return result;
  }
}

@Controller('api/events')
@ApiTags('events')
export class EventsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('')
  @ApiOperation({ operationId: 'getEvents', description: 'Gets imported events, newest first.' })
  @ApiOkResponse({ type: EventsDto })
  async getEvents(@Query() { page, pageSize }: PageQueryDto) {
    const { items, total } = await this.queryBus.execute(new GetEventsQuery(page, pageSize));

    return EventsDto.fromDomain(items, total);
  }
}
