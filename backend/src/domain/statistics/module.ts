import { Module } from '@nestjs/common';
import { GetCasterDetailsHandler, GetFactionDetailsHandler, GetFactionStatsHandler, GetMatchupsHandler } from './use-cases';

@Module({
  providers: [
    GetCasterDetailsHandler, //
    GetFactionDetailsHandler,
    GetFactionStatsHandler,
    GetMatchupsHandler,
  ],
})
export class StatisticsModule {}
