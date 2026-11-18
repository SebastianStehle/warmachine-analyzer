import { ApiProperty } from '@nestjs/swagger';
import { ShopProduct, ShopProductContent } from 'src/domain/lists';

export class ShopProductContentDto {
  @ApiProperty({ description: 'The name of the model.', required: true })
  name: string;

  @ApiProperty({ description: 'How often the model is in the product.', required: true })
  quantity: number;

  static fromDomain({ name, quantity }: ShopProductContent) {
    const result = new ShopProductContentDto();
    result.name = name;
    result.quantity = quantity;
    return result;
  }
}

export class ShopProductDto {
  @ApiProperty({ description: 'The ID of the product in the shop.', required: true })
  shopId: string;

  @ApiProperty({ description: 'The name of the product.', required: true })
  title: string;

  @ApiProperty({ description: 'The link to the product in the shop.', required: true })
  url: string;

  @ApiProperty({ description: 'The image of the product.', required: true, nullable: true, type: String })
  imageUrl: string | null;

  @ApiProperty({ description: 'The price of the product in cents.', required: true })
  price: number;

  @ApiProperty({ description: 'Whether the product can be ordered.', required: true })
  available: boolean;

  @ApiProperty({ description: 'The models in the product.', required: true, type: [ShopProductContentDto] })
  models: ShopProductContentDto[];

  static fromDomain(source: ShopProduct) {
    const { models, ...rest } = source;

    const result = new ShopProductDto();
    Object.assign(result, rest);
    result.models = models.map(ShopProductContentDto.fromDomain);
    return result;
  }
}

export class ShopProductsDto {
  @ApiProperty({ description: 'The products.', required: true, type: [ShopProductDto] })
  items: ShopProductDto[];

  @ApiProperty({ description: 'The currency of the prices.', required: true, nullable: true, type: String })
  currency: string | null;

  static fromDomain(items: ShopProduct[], currency: string | null) {
    const result = new ShopProductsDto();
    result.items = items.map(ShopProductDto.fromDomain);
    result.currency = currency;
    return result;
  }
}
