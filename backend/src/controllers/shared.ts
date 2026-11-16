import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { Record } from 'src/domain/statistics';

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

  static assignRecord(target: RecordDto, { games, wins, losses, draws, winRate }: Record) {
    Object.assign(target, { games, wins, losses, draws, winRate });
  }
}
