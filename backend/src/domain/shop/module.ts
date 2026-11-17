import { Module } from '@nestjs/common';
import { ShopClient } from './client';

@Module({
  providers: [ShopClient],
  exports: [ShopClient],
})
export class ShopModule {}
