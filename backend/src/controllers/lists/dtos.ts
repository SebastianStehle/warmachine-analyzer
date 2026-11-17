import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { GameResult, ListEntryKind } from 'src/domain/database';
import { CasterOption, ListDetails, ListEntry, ListGame, ListSortField, ListSummary } from 'src/domain/lists';
import { DateRangeQueryDto, PageQueryDto, SearchQueryDto, toArray, toEnumObject } from '../shared';

const LIST_ENTRY_KINDS: ListEntryKind[] = ['leader', 'model', 'module'];
const GAME_RESULTS: GameResult[] = ['win', 'loss', 'draw'];

const LIST_SORT_FIELDS = toEnumObject<ListSortField>(['date', 'event', 'player', 'rank', 'army', 'caster']);

export class ListsQueryDto extends IntersectionType(DateRangeQueryDto, PageQueryDto, SearchQueryDto) {
  @ApiProperty({
    description: 'The field to sort by.',
    required: false,
    enum: LIST_SORT_FIELDS,
    enumName: 'ListSortField',
  })
  @IsOptional()
  @IsEnum(LIST_SORT_FIELDS)
  sort?: ListSortField;

  @ApiProperty({
    description: 'Only lists of this player.',
    required: false,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  playerId?: number;

  @ApiProperty({
    description: 'Only lists of this event.',
    required: false,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  eventId?: number;

  @ApiProperty({
    description: 'Only lists of these armies.',
    required: false,
    type: [String],
  })
  @IsOptional()
  @Transform(toArray)
  @IsString({ each: true })
  army?: string[];

  @ApiProperty({
    description: 'Only lists with one of these casters.',
    required: false,
    type: [String],
  })
  @IsOptional()
  @Transform(toArray)
  @IsString({ each: true })
  caster?: string[];

  @ApiProperty({
    description: 'Only lists containing this model or unit.',
    required: false,
  })
  @IsOptional()
  @IsString()
  unit?: string;
}

export class ListSummaryDto {
  @ApiProperty({ description: 'The ID of the list.', required: true })
  id: number;

  @ApiProperty({ description: 'The title of the list.', required: true })
  title: string;

  @ApiProperty({ description: 'The parent faction.', required: true, nullable: true, type: String })
  faction: string | null;

  @ApiProperty({ description: 'The army.', required: true, nullable: true, type: String })
  army: string | null;

  @ApiProperty({ description: 'The caster.', required: true, nullable: true, type: String })
  caster: string | null;

  @ApiProperty({ description: 'The total points.', required: true, nullable: true, type: Number })
  totalPoints: number | null;

  @ApiProperty({ description: 'The Longshanks ID of the event.', required: true })
  eventId: number;

  @ApiProperty({ description: 'The name of the event.', required: true })
  eventName: string;

  @ApiProperty({ description: 'The date of the event.', required: true })
  eventDate: string;

  @ApiProperty({ description: 'The number of players in the event.', required: true })
  eventPlayers: number;

  @ApiProperty({ description: 'The Longshanks ID of the player.', required: true })
  playerId: number;

  @ApiProperty({ description: 'The name of the player.', required: true })
  playerName: string;

  @ApiProperty({ description: 'The final rank in the event.', required: true, nullable: true, type: Number })
  rank: number | null;

  @ApiProperty({ description: 'The wins of the player in the event.', required: true, nullable: true, type: Number })
  eventWins: number | null;

  @ApiProperty({ description: 'The losses of the player in the event.', required: true, nullable: true, type: Number })
  eventLosses: number | null;

  @ApiProperty({ description: 'The games played with this list.', required: true })
  games: number;

  @ApiProperty({ description: 'The games won with this list.', required: true })
  wins: number;

  static fromDomain(source: ListSummary) {
    const result = new ListSummaryDto();
    Object.assign(result, source);
    return result;
  }
}

export class ListsDto {
  @ApiProperty({ description: 'The lists.', required: true, type: [ListSummaryDto] })
  items: ListSummaryDto[];

  @ApiProperty({ description: 'The total number of lists.', required: true })
  total: number;

  static fromDomain(items: ListSummary[], total: number) {
    const result = new ListsDto();
    result.items = items.map(ListSummaryDto.fromDomain);
    result.total = total;
    return result;
  }
}

export class ListEntryDto {
  @ApiProperty({ description: 'The name as written in the list.', required: true })
  name: string;

  @ApiProperty({ description: 'The points cost.', required: true, nullable: true, type: Number })
  points: number | null;

  @ApiProperty({ description: 'The indentation level.', required: true })
  depth: number;

  @ApiProperty({ description: 'The kind of entry.', required: true, enum: LIST_ENTRY_KINDS, enumName: 'ListEntryKind' })
  kind: ListEntryKind;

  static fromDomain({ name, points, depth, kind }: ListEntry) {
    const result = new ListEntryDto();
    Object.assign(result, { name, points, depth, kind });
    return result;
  }
}

export class ListGameDto {
  @ApiProperty({ description: 'The round.', required: true })
  round: number;

  @ApiProperty({ description: 'The Longshanks ID of the opponent.', required: true, nullable: true, type: Number })
  opponentId: number | null;

  @ApiProperty({ description: 'The scenario.', required: true, nullable: true, type: String })
  scenario: string | null;

  @ApiProperty({ description: 'The opponent.', required: true, nullable: true, type: String })
  opponentName: string | null;

  @ApiProperty({ description: 'The army of the opponent.', required: true, nullable: true, type: String })
  opponentArmy: string | null;

  @ApiProperty({ description: 'The caster of the opponent.', required: true, nullable: true, type: String })
  opponentCaster: string | null;

  @ApiProperty({ description: 'The result.', required: true, enum: GAME_RESULTS, enumName: 'GameResult' })
  result: GameResult;

  @ApiProperty({ description: 'The control points.', required: true, nullable: true, type: Number })
  controlPoints: number | null;

  @ApiProperty({ description: 'The army points.', required: true, nullable: true, type: Number })
  armyPoints: number | null;

  static fromDomain(source: ListGame) {
    const result = new ListGameDto();
    Object.assign(result, source);
    return result;
  }
}

export class ListDetailsDto extends ListSummaryDto {
  @ApiProperty({ description: 'The game format.', required: true, nullable: true, type: String })
  format: string | null;

  @ApiProperty({ description: 'The point level.', required: true, nullable: true, type: Number })
  pointLevel: number | null;

  @ApiProperty({ description: 'The list as submitted.', required: true })
  rawText: string;

  @ApiProperty({ description: 'The command cards.', required: true, type: [String] })
  commandCards: string[];

  @ApiProperty({ description: 'Problems found while parsing.', required: true, type: [String] })
  warnings: string[];

  @ApiProperty({ description: 'The entries.', required: true, type: [ListEntryDto] })
  entries: ListEntryDto[];

  @ApiProperty({ description: 'The games played with this list.', required: true, type: [ListGameDto] })
  playedGames: ListGameDto[];

  static fromDomain(source: ListDetails) {
    const { entries, playedGames, ...rest } = source;

    const result = new ListDetailsDto();
    Object.assign(result, rest);
    result.entries = entries.map(ListEntryDto.fromDomain);
    result.playedGames = playedGames.map(ListGameDto.fromDomain);
    return result;
  }
}

export class CastersQueryDto extends DateRangeQueryDto {
  @ApiProperty({
    description: 'Only casters of these armies.',
    required: false,
    type: [String],
  })
  @IsOptional()
  @Transform(toArray)
  @IsString({ each: true })
  army?: string[];
}

export class CasterOptionDto {
  @ApiProperty({ description: 'The caster.', required: true })
  caster: string;

  @ApiProperty({ description: 'The army.', required: true, nullable: true, type: String })
  army: string | null;

  @ApiProperty({ description: 'The number of lists with this caster.', required: true })
  lists: number;

  static fromDomain({ caster, army, lists }: CasterOption) {
    const result = new CasterOptionDto();
    Object.assign(result, { caster, army, lists });
    return result;
  }
}

export class CasterOptionsDto {
  @ApiProperty({ description: 'The casters.', required: true, type: [CasterOptionDto] })
  items: CasterOptionDto[];

  static fromDomain(items: CasterOption[]) {
    const result = new CasterOptionsDto();
    result.items = items.map(CasterOptionDto.fromDomain);
    return result;
  }
}
