import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiParam, ApiProperty, ApiTags, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import {
  ArmyUsage,
  GetPlayerQuery,
  GetPlayersQuery,
  Participation,
  PlayerDetails,
  PlayerList,
  PlayerSortField,
  PlayerSummary,
} from 'src/domain/players';
import { DateRangeQueryDto, PageQueryDto, SearchQueryDto, toEnumObject } from '../shared';

const PLAYER_SORT_FIELDS = toEnumObject<PlayerSortField>(['name', 'events', 'wins', 'winRate', 'lastEvent']);

export class PlayersQueryDto extends IntersectionType(DateRangeQueryDto, PageQueryDto, SearchQueryDto) {
  @ApiProperty({
    description: 'The field to sort by.',
    required: false,
    enum: PLAYER_SORT_FIELDS,
    enumName: 'PlayerSortField',
  })
  @IsOptional()
  @IsEnum(PLAYER_SORT_FIELDS)
  sort?: PlayerSortField;
}

export class PlayerSummaryDto {
  @ApiProperty({ description: 'The Longshanks ID of the player.', required: true })
  id: number;

  @ApiProperty({ description: 'The name.', required: true })
  name: string;

  @ApiProperty({ description: 'The number of events.', required: true })
  events: number;

  @ApiProperty({ description: 'The wins over all events.', required: true })
  wins: number;

  @ApiProperty({ description: 'The losses over all events.', required: true })
  losses: number;

  @ApiProperty({ description: 'Wins divided by games. Null without games.', required: true, nullable: true, type: Number })
  winRate: number | null;

  @ApiProperty({ description: 'The date of the last event.', required: true, nullable: true, type: String })
  lastEventDate: string | null;

  @ApiProperty({ description: 'The army played most often.', required: true, nullable: true, type: String })
  mainArmy: string | null;

  static fromDomain(source: PlayerSummary) {
    const result = new PlayerSummaryDto();
    Object.assign(result, source);
    return result;
  }
}

export class PlayersDto {
  @ApiProperty({ description: 'The players.', required: true, type: [PlayerSummaryDto] })
  items: PlayerSummaryDto[];

  @ApiProperty({ description: 'The total number of players.', required: true })
  total: number;

  static fromDomain(items: PlayerSummary[], total: number) {
    const result = new PlayersDto();
    result.items = items.map(PlayerSummaryDto.fromDomain);
    result.total = total;
    return result;
  }
}

export class PlayerListDto {
  @ApiProperty({ description: 'The ID of the list.', required: true })
  id: number;

  @ApiProperty({ description: 'The caster.', required: true, nullable: true, type: String })
  caster: string | null;

  static fromDomain({ id, caster }: PlayerList) {
    const result = new PlayerListDto();
    Object.assign(result, { id, caster });
    return result;
  }
}

export class ParticipationDto {
  @ApiProperty({ description: 'The Longshanks ID of the event.', required: true })
  eventId: number;

  @ApiProperty({ description: 'The name of the event.', required: true })
  eventName: string;

  @ApiProperty({ description: 'The date of the event.', required: true })
  eventDate: string;

  @ApiProperty({ description: 'The number of players in the event.', required: true })
  eventPlayers: number;

  @ApiProperty({ description: 'The final rank.', required: true })
  rank: number;

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

  @ApiProperty({ description: 'The submitted lists.', required: true, type: [PlayerListDto] })
  lists: PlayerListDto[];

  static fromDomain({ lists, ...source }: Participation) {
    const result = new ParticipationDto();
    Object.assign(result, source);
    result.lists = lists.map(PlayerListDto.fromDomain);
    return result;
  }
}

export class ArmyUsageDto {
  @ApiProperty({ description: 'The army.', required: true })
  army: string;

  @ApiProperty({ description: 'The parent faction.', required: true, nullable: true, type: String })
  faction: string | null;

  @ApiProperty({ description: 'The number of events with this army.', required: true })
  events: number;

  @ApiProperty({ description: 'The wins with this army.', required: true })
  wins: number;

  @ApiProperty({ description: 'The losses with this army.', required: true })
  losses: number;

  @ApiProperty({ description: 'Wins divided by games. Null without games.', required: true, nullable: true, type: Number })
  winRate: number | null;

  static fromDomain(source: ArmyUsage) {
    const result = new ArmyUsageDto();
    Object.assign(result, source);
    return result;
  }
}

export class PlayerDetailsDto {
  @ApiProperty({ description: 'The Longshanks ID of the player.', required: true })
  id: number;

  @ApiProperty({ description: 'The name.', required: true })
  name: string;

  @ApiProperty({ description: 'The number of events.', required: true })
  events: number;

  @ApiProperty({ description: 'The wins over all events.', required: true })
  wins: number;

  @ApiProperty({ description: 'The losses over all events.', required: true })
  losses: number;

  @ApiProperty({ description: 'Wins divided by games. Null without games.', required: true, nullable: true, type: Number })
  winRate: number | null;

  @ApiProperty({ description: 'The armies played.', required: true, type: [ArmyUsageDto] })
  armies: ArmyUsageDto[];

  @ApiProperty({ description: 'The events played, newest first.', required: true, type: [ParticipationDto] })
  participations: ParticipationDto[];

  static fromDomain({ armies, participations, ...source }: PlayerDetails) {
    const result = new PlayerDetailsDto();
    Object.assign(result, source);
    result.armies = armies.map(ArmyUsageDto.fromDomain);
    result.participations = participations.map(ParticipationDto.fromDomain);
    return result;
  }
}

@Controller('api/players')
@ApiTags('players')
export class PlayersController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('')
  @ApiOperation({ operationId: 'getPlayers', description: 'Gets players with their results.' })
  @ApiOkResponse({ type: PlayersDto })
  async getPlayers(@Query() query: PlayersQueryDto) {
    const { items, total } = await this.queryBus.execute(new GetPlayersQuery(query));

    return PlayersDto.fromDomain(items, total);
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getPlayer', description: 'Gets a player with all events.' })
  @ApiParam({ name: 'id', description: 'The Longshanks ID of the player.', required: true, type: 'number' })
  @ApiOkResponse({ type: PlayerDetailsDto })
  async getPlayer(@Param('id', ParseIntPipe) id: number) {
    const { player } = await this.queryBus.execute(new GetPlayerQuery(id));

    return PlayerDetailsDto.fromDomain(player);
  }
}
