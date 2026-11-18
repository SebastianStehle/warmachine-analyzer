import { Module } from '@nestjs/common';
import { ShopModule } from 'src/domain/shop';
import {
  GetCastersHandler,
  GetListHandler,
  GetListPricesHandler,
  GetListsHandler,
  GetPointLevelsHandler,
  GetShopProductsHandler,
} from './use-cases';

@Module({
  imports: [ShopModule],
  providers: [
    GetCastersHandler, //
    GetListHandler,
    GetListPricesHandler,
    GetListsHandler,
    GetPointLevelsHandler,
    GetShopProductsHandler,
  ],
})
export class ListsModule {}
