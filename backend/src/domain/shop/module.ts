import { Module } from '@nestjs/common';
import { ShopClient } from './client';
import { ListPricing } from './list-pricing';

@Module({
  providers: [ListPricing, ShopClient],
  exports: [ListPricing, ShopClient],
})
export class ShopModule {}
