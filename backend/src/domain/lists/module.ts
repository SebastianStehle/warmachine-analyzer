import { Module } from '@nestjs/common';
import { GetCastersHandler, GetListHandler, GetListsHandler, GetPointLevelsHandler } from './use-cases';

@Module({
  providers: [
    GetCastersHandler, //
    GetListHandler,
    GetListsHandler,
    GetPointLevelsHandler,
  ],
})
export class ListsModule {}
