import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetShopProductsQuery } from 'src/domain/lists';
import { ShopProductsDto } from './dtos';

@Controller('api/shop')
@ApiTags('shop')
export class ShopController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('products')
  @ApiOperation({ operationId: 'getShopProducts', description: 'Gets the products of the shop that contain models.' })
  @ApiOkResponse({ type: ShopProductsDto })
  async getShopProducts() {
    const { products, currency } = await this.queryBus.execute(new GetShopProductsQuery());

    return ShopProductsDto.fromDomain(products, currency);
  }
}
