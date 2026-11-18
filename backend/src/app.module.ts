import { join } from 'path';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { EventsController } from './controllers/events/events.controller';
import { ListsController } from './controllers/lists/lists.controller';
import { PlayersController } from './controllers/players/players.controller';
import { ShopController } from './controllers/shop/shop.controller';
import { StatisticsController } from './controllers/statistics/statistics.controller';
import { CoreModule } from './domain/database';
import { EventsModule } from './domain/events';
import { ImportsSchedulerModule } from './domain/imports';
import { ListsModule } from './domain/lists';
import { PlayersModule } from './domain/players';
import { StatisticsModule } from './domain/statistics';

@Module({
  imports: [
    CoreModule,
    EventsModule,
    ImportsSchedulerModule,
    ListsModule,
    PlayersModule,
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({ rootPath: join(__dirname, '..', 'assets'), exclude: ['/api/{*path}'] }),
    StatisticsModule,
  ],
  controllers: [EventsController, ListsController, PlayersController, ShopController, StatisticsController],
})
export class AppModule {}
