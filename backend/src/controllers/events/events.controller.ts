import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiParam, ApiProperty, ApiTags, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import {
  EventDetails,
  EventSortField,
  EventStanding,
  EventSummary,
  GetEventQuery,
  GetEventsQuery,
  StandingList,
} from 'src/domain/events';
import { DateRangeQueryDto, PageQueryDto, SearchQueryDto, toEnumObject } from '../shared';

const EVENT_SORT_FIELDS = toEnumObject<EventSortField>(['date', 'name', 'players', 'rounds']);

export class EventsQueryDto extends IntersectionType(DateRangeQueryDto, PageQueryDto, SearchQueryDto) {
  @ApiProperty({
    description: 'The field to sort by.',
    required: false,
    enum: EVENT_SORT_FIELDS,
    enumName: 'EventSortField',
  })
  @IsOptional()
  @IsEnum(EVENT_SORT_FIELDS)
  sort?: EventSortField;
}

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
    const { id, name, date, location, type, playerCount, rounds, lists } = source;

    const result = new EventDto();
    Object.assign(result, { id, name, date, location, type, playerCount, rounds, lists });
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

export class StandingListDto {
  @ApiProperty({ description: 'The ID of the list.', required: true })
  id: number;

  @ApiProperty({ description: 'The caster.', required: true, nullable: true, type: String })
  caster: string | null;

  static fromDomain({ id, caster }: StandingList) {
    const result = new StandingListDto();
    Object.assign(result, { id, caster });
    return result;
  }
}

export class EventStandingDto {
  @ApiProperty({ description: 'The final rank.', required: true })
  rank: number;

  @ApiProperty({ description: 'The Longshanks ID of the player.', required: true })
  playerId: number;

  @ApiProperty({ description: 'The name of the player.', required: true })
  playerName: string;

  @ApiProperty({ description: 'The army.', required: true, nullable: true, type: String })
  army: string | null;

  @ApiProperty({ description: 'The parent faction.', required: true, nullable: true, type: String })
  faction: string | null;

  @ApiProperty({ description: 'The tournament points.', required: true })
  tournamentPoints: number;

  @ApiProperty({ description: 'The wins.', required: true })
  wins: number;

  @ApiProperty({ description: 'The losses.', required: true })
  losses: number;

  @ApiProperty({ description: 'The strength of schedule.', required: true, nullable: true, type: Number })
  strengthOfSchedule: number | null;

  @ApiProperty({ description: 'The control points.', required: true, nullable: true, type: Number })
  controlPoints: number | null;

  @ApiProperty({ description: 'The army points.', required: true, nullable: true, type: Number })
  armyPoints: number | null;

  @ApiProperty({ description: 'The submitted lists.', required: true, type: [StandingListDto] })
  lists: StandingListDto[];

  static fromDomain({ lists, ...source }: EventStanding) {
    const result = new EventStandingDto();
    Object.assign(result, source);
    result.lists = lists.map(StandingListDto.fromDomain);
    return result;
  }
}

export class EventDetailsDto extends EventDto {
  @ApiProperty({ description: 'The final standings.', required: true, type: [EventStandingDto] })
  standings: EventStandingDto[];

  static fromDomain(source: EventDetails) {
    const result = new EventDetailsDto();
    Object.assign(result, EventDto.fromDomain(source));
    result.standings = source.standings.map(EventStandingDto.fromDomain);
    return result;
  }
}

@Controller('api/events')
@ApiTags('events')
export class EventsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('')
  @ApiOperation({ operationId: 'getEvents', description: 'Gets imported events.' })
  @ApiOkResponse({ type: EventsDto })
  async getEvents(@Query() query: EventsQueryDto) {
    const { items, total } = await this.queryBus.execute(new GetEventsQuery(query));

    return EventsDto.fromDomain(items, total);
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getEvent', description: 'Gets an event with standings.' })
  @ApiParam({ name: 'id', description: 'The Longshanks ID of the event.', required: true, type: 'number' })
  @ApiOkResponse({ type: EventDetailsDto })
  async getEvent(@Param('id', ParseIntPipe) id: number) {
    const { event } = await this.queryBus.execute(new GetEventQuery(id));

    return EventDetailsDto.fromDomain(event);
  }
}
