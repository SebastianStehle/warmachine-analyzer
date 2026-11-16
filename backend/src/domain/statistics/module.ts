import { Module } from '@nestjs/common';
import { GetFactionDetailsHandler, GetFactionStatsHandler } from './use-cases';

@Module({
  providers: [
    GetFactionDetailsHandler, //
    GetFactionStatsHandler,
  ],
})
export class StatisticsModule {}
