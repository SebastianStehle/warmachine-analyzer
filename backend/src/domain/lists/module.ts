import { Module } from '@nestjs/common';
import { GetListHandler, GetListsHandler } from './use-cases';

@Module({
  providers: [
    GetListHandler, //
    GetListsHandler,
  ],
})
export class ListsModule {}
