import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity, ModelEntity } from 'src/domain/database';
import { LongshanksModule } from 'src/domain/longshanks';
import { ShopModule } from 'src/domain/shop';
import { WikiModule } from 'src/domain/wiki';
import { CatalogSeeder } from './catalog-seeder';
import { CrawlerScheduler } from './scheduler';
import {
  DiscoverEventsHandler,
  ImportCatalogHandler,
  ImportEventHandler,
  ImportShopHandler,
  ReparseEventsHandler,
  UpdateCatalogHandler,
  UpdatePricesHandler,
} from './use-cases';

@Module({
  imports: [LongshanksModule, ShopModule, TypeOrmModule.forFeature([EventEntity, ModelEntity]), WikiModule],
  providers: [
    CatalogSeeder, //
    DiscoverEventsHandler,
    ImportCatalogHandler,
    ImportEventHandler,
    ImportShopHandler,
    ReparseEventsHandler,
    UpdateCatalogHandler,
    UpdatePricesHandler,
  ],
})
export class ImportsModule {}

@Module({
  imports: [ImportsModule],
  providers: [CrawlerScheduler],
})
export class ImportsSchedulerModule {}
