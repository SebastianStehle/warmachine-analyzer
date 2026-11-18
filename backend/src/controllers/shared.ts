import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { SortOrder } from 'src/domain/common/query';
import { GameRecord } from 'src/domain/statistics';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

export class DateRangeQueryDto {
  @ApiProperty({
    description: 'Only include events on or after this date (YYYY-MM-DD).',
    required: false,
  })
  @IsOptional()
  @Matches(ISO_DATE)
  from?: string;

  @ApiProperty({
    description: 'Only include events on or before this date (YYYY-MM-DD).',
    required: false,
  })
  @IsOptional()
  @Matches(ISO_DATE)
  to?: string;
}

export class PageQueryDto {
  @ApiProperty({
    description: 'The zero based page.',
    required: false,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page = 0;

  @ApiProperty({
    description: 'The number of items per page.',
    required: false,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize = DEFAULT_PAGE_SIZE;
}

const SORT_ORDERS: Record<SortOrder, SortOrder> = { asc: 'asc', desc: 'desc' };

export class SearchQueryDto {
  @ApiProperty({
    description: 'Case insensitive text search.',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'The sort direction.',
    required: false,
    enum: SORT_ORDERS,
    enumName: 'SortOrder',
  })
  @IsOptional()
  @IsEnum(SORT_ORDERS)
  order?: SortOrder;
}

// Swagger and class-validator both need the allowed values of a string union as an object.
export const toEnumObject = <T extends string>(values: readonly T[]) => {
  const result = {} as Record<T, T>;
  for (const value of values) {
    result[value] = value;
  }
  return result;
};

// A single query value arrives as a string, several as an array.
export const toArray = ({ value }: { value: unknown }) => (typeof value === 'string' ? [value] : value);

export class RecordDto {
  @ApiProperty({
    description: 'The number of games, without byes and mirror matches.',
    required: true,
  })
  games: number;

  @ApiProperty({
    description: 'The number of wins.',
    required: true,
  })
  wins: number;

  @ApiProperty({
    description: 'The number of losses.',
    required: true,
  })
  losses: number;

  @ApiProperty({
    description: 'The number of draws.',
    required: true,
  })
  draws: number;

  @ApiProperty({
    description: 'Wins plus half the draws divided by games. Null without games.',
    required: true,
    nullable: true,
    type: Number,
  })
  winRate: number | null;

  static fromDomain(source: GameRecord) {
    const result = new RecordDto();
    RecordDto.assignRecord(result, source);
    return result;
  }

  static assignRecord(target: RecordDto, { games, wins, losses, draws, winRate }: GameRecord) {
    Object.assign(target, { games, wins, losses, draws, winRate });
  }
}
