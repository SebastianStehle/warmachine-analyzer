import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { GameResult, ListEntryKind, ModelType } from 'src/domain/database';
import {
  CasterOption,
  ListDetails,
  ListEntry,
  ListGame,
  ListPrice,
  ListProduct,
  ListSortField,
  ListSummary,
  PointLevelOption,
} from 'src/domain/lists';
import { DateRangeQueryDto, PageQueryDto, SearchQueryDto, toArray, toEnumObject } from '../shared';
import { MODEL_TYPES } from '../statistics/dtos';

const LIST_ENTRY_KINDS: ListEntryKind[] = ['leader', 'model', 'module'];
const GAME_RESULTS: GameResult[] = ['win', 'loss', 'draw'];

const LIST_SORT_FIELDS = toEnumObject<ListSortField>(['date', 'event', 'player', 'rank', 'army', 'caster', 'points', 'price']);

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
    description: 'Only lists for these point levels.',
    required: false,
    type: [Number],
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (Array.isArray(value) ? value : [value]).map(Number))
  @IsInt({ each: true })
  pointLevel?: number[];

  @ApiProperty({
    description: 'Only lists of players who placed at this rank or better.',
    required: false,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxRank?: number;

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

  @ApiProperty({ description: 'The army.', required: true })
  army: string;

  @ApiProperty({ description: 'The caster.', required: true, nullable: true, type: String })
  caster: string | null;

  @ApiProperty({ description: 'The point level of the game.', required: true, nullable: true, type: Number })
  pointLevel: number | null;

  @ApiProperty({ description: 'The total points.', required: true, nullable: true, type: Number })
  totalPoints: number | null;

  @ApiProperty({
    description: 'The price of the cheapest products that contain the models of the list, in cents.',
    required: true,
    nullable: true,
    type: Number,
  })
  price: number | null;

  @ApiProperty({ description: 'The currency of the price.', required: true, nullable: true, type: String })
  currency: string | null;

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

  @ApiProperty({ description: 'The name of the matched model in the wiki.', required: true, nullable: true, type: String })
  modelName: string | null;

  @ApiProperty({
    description: 'The type of the matched model.',
    required: true,
    nullable: true,
    enum: MODEL_TYPES,
    enumName: 'ModelType',
  })
  modelType: ModelType | null;

  @ApiProperty({ description: 'The page of the matched model in the wiki.', required: true, nullable: true, type: String })
  wikiPage: string | null;

  static fromDomain({ name, points, depth, kind, modelName, modelType, wikiPage }: ListEntry) {
    const result = new ListEntryDto();
    Object.assign(result, { name, points, depth, kind, modelName, modelType, wikiPage });
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

export class ListProductDto {
  @ApiProperty({ description: 'The name of the product.', required: true })
  title: string;

  @ApiProperty({ description: 'The link to the product in the shop.', required: true })
  url: string;

  @ApiProperty({ description: 'The image of the product.', required: true, nullable: true, type: String })
  imageUrl: string | null;

  @ApiProperty({ description: 'The price of one product in cents.', required: true })
  price: number;

  @ApiProperty({ description: 'How often the product is needed.', required: true })
  quantity: number;

  @ApiProperty({ description: 'Whether the product can be ordered.', required: true })
  available: boolean;

  static fromDomain(source: ListProduct) {
    const result = new ListProductDto();
    Object.assign(result, source);
    return result;
  }
}

export class ListDetailsDto extends ListSummaryDto {
  @ApiProperty({ description: 'The picture of the caster from the wiki.', required: true, nullable: true, type: String })
  casterImageUrl: string | null;

  @ApiProperty({ description: 'The game format.', required: true, nullable: true, type: String })
  format: string | null;

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

  @ApiProperty({
    description: 'The cheapest products that contain the models of the list.',
    required: true,
    type: [ListProductDto],
  })
  products: ListProductDto[];

  @ApiProperty({ description: 'Models of the list that are not sold in the shop.', required: true, type: [String] })
  unpricedModels: string[];

  static fromDomain(source: ListDetails) {
    const { entries, playedGames, products, ...rest } = source;

    const result = new ListDetailsDto();
    Object.assign(result, rest);
    result.entries = entries.map(ListEntryDto.fromDomain);
    result.playedGames = playedGames.map(ListGameDto.fromDomain);
    result.products = products.map(ListProductDto.fromDomain);
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

  @ApiProperty({ description: 'The army.', required: true })
  army: string;

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

export class PointLevelOptionDto {
  @ApiProperty({ description: 'The point level of the game.', required: true })
  pointLevel: number;

  @ApiProperty({ description: 'The number of lists for this point level.', required: true })
  lists: number;

  static fromDomain({ pointLevel, lists }: PointLevelOption) {
    const result = new PointLevelOptionDto();
    Object.assign(result, { pointLevel, lists });
    return result;
  }
}

export class PointLevelOptionsDto {
  @ApiProperty({ description: 'The point levels.', required: true, type: [PointLevelOptionDto] })
  items: PointLevelOptionDto[];

  static fromDomain(items: PointLevelOption[]) {
    const result = new PointLevelOptionsDto();
    result.items = items.map(PointLevelOptionDto.fromDomain);
    return result;
  }
}

// One page of the lists table, so the prices of a page can be calculated with one request.
const MAX_PRICED_LISTS = 100;

export class OwnedProductDto {
  @ApiProperty({ description: 'The ID of the product in the shop.', required: true })
  @IsString()
  shopId: string;

  @ApiProperty({ description: 'How often the product is owned.', required: true })
  @IsInt()
  @Min(0)
  quantity: number;
}

export class ListPricesRequestDto {
  @ApiProperty({ description: 'The lists to calculate the prices for.', required: true, type: [Number] })
  @IsInt({ each: true })
  @ArrayMaxSize(MAX_PRICED_LISTS)
  listIds: number[];

  @ApiProperty({ description: 'The products that are already owned.', required: true, type: [OwnedProductDto] })
  @ValidateNested({ each: true })
  @Type(() => OwnedProductDto)
  owned: OwnedProductDto[];
}

export class ListPriceDto {
  @ApiProperty({ description: 'The ID of the list.', required: true })
  listId: number;

  @ApiProperty({
    description: 'The price of the products that are still needed, in cents.',
    required: true,
    nullable: true,
    type: Number,
  })
  price: number | null;

  @ApiProperty({ description: 'The products that are still needed.', required: true, type: [ListProductDto] })
  products: ListProductDto[];

  static fromDomain({ listId, price, products }: ListPrice) {
    const result = new ListPriceDto();
    result.listId = listId;
    result.price = price;
    result.products = products.map(ListProductDto.fromDomain);
    return result;
  }
}

export class ListPricesDto {
  @ApiProperty({ description: 'The prices.', required: true, type: [ListPriceDto] })
  items: ListPriceDto[];

  @ApiProperty({ description: 'The currency of the prices.', required: true, nullable: true, type: String })
  currency: string | null;

  static fromDomain(items: ListPrice[], currency: string | null) {
    const result = new ListPricesDto();
    result.items = items.map(ListPriceDto.fromDomain);
    result.currency = currency;
    return result;
  }
}
