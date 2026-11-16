import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity } from 'src/domain/database';
import { LongshanksModule } from 'src/domain/longshanks';
import { CrawlerScheduler } from './scheduler';
import { DiscoverEventsHandler, ImportEventHandler } from './use-cases';

@Module({
  imports: [LongshanksModule, TypeOrmModule.forFeature([EventEntity])],
  providers: [
    DiscoverEventsHandler, //
    ImportEventHandler,
  ],
})
export class ImportsModule {}

@Module({
  imports: [ImportsModule],
  providers: [CrawlerScheduler],
})
export class ImportsSchedulerModule {}
