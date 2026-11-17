import { Module } from '@nestjs/common';
import { GetPlayerHandler } from './use-cases/get-player';
import { GetPlayersHandler } from './use-cases/get-players';

export * from './use-cases/get-player';
export * from './use-cases/get-players';

@Module({
  providers: [
    GetPlayerHandler, //
    GetPlayersHandler,
  ],
})
export class PlayersModule {}
