import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity, ModelEntity, SettingEntity } from 'src/domain/database';
import { LongshanksModule } from 'src/domain/longshanks';
import { ShopModule } from 'src/domain/shop';
import { WikiModule } from 'src/domain/wiki';
import { CatalogSeeder } from './catalog-seeder';
import { ParserUpgrader } from './parser-upgrader';
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
  imports: [LongshanksModule, ShopModule, TypeOrmModule.forFeature([EventEntity, ModelEntity, SettingEntity]), WikiModule],
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
  imports: [ImportsModule, TypeOrmModule.forFeature([ModelEntity, SettingEntity])],
  providers: [CrawlerScheduler, ParserUpgrader],
})
export class ImportsSchedulerModule {}
