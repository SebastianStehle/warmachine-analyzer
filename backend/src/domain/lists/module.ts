import { Module } from '@nestjs/common';
import { GetCastersHandler, GetListHandler, GetListsHandler } from './use-cases';

@Module({
  providers: [
    GetCastersHandler, //
    GetListHandler,
    GetListsHandler,
  ],
})
export class ListsModule {}
