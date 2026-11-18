import { Module } from '@nestjs/common';
import { ShopModule } from 'src/domain/shop';
import {
  GetCastersHandler,
  GetListHandler,
  GetListPricesHandler,
  GetListsHandler,
  GetPlayableListsHandler,
  GetPointLevelsHandler,
  GetShopProductsHandler,
  GetUnmatchedEntriesHandler,
} from './use-cases';

@Module({
  imports: [ShopModule],
  providers: [
    GetCastersHandler, //
    GetListHandler,
    GetListPricesHandler,
    GetListsHandler,
    GetPointLevelsHandler,
    GetPlayableListsHandler,
    GetShopProductsHandler,
    GetUnmatchedEntriesHandler,
  ],
})
export class ListsModule {}
