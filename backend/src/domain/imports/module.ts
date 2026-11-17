import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity, ModelEntity } from 'src/domain/database';
import { LongshanksModule } from 'src/domain/longshanks';
import { WikiModule } from 'src/domain/wiki';
import { CatalogSeeder } from './catalog-seeder';
import { CrawlerScheduler } from './scheduler';
import {
  DiscoverEventsHandler,
  ImportCatalogHandler,
  ImportEventHandler,
  ReparseEventsHandler,
  UpdateCatalogHandler,
} from './use-cases';

@Module({
  imports: [LongshanksModule, TypeOrmModule.forFeature([EventEntity, ModelEntity]), WikiModule],
  providers: [
    CatalogSeeder, //
    DiscoverEventsHandler,
    ImportCatalogHandler,
    ImportEventHandler,
    ReparseEventsHandler,
    UpdateCatalogHandler,
  ],
})
export class ImportsModule {}

@Module({
  imports: [ImportsModule],
  providers: [CrawlerScheduler],
})
export class ImportsSchedulerModule {}
