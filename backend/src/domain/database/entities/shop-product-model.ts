import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Repository } from 'typeorm';
import { ModelEntity } from './model';
import { ShopProductEntity } from './shop-product';

export type ShopProductModelRepository = Repository<ShopProductModelEntity>;

@Entity({ name: 'shop_product_models' })
export class ShopProductModelEntity {
  @PrimaryColumn('int')
  productId: number;

  @ManyToOne(() => ShopProductEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: ShopProductEntity;

  @PrimaryColumn('int')
  modelId: number;

  @ManyToOne(() => ModelEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'modelId' })
  model: ModelEntity;

  @Column('int')
  quantity: number;
}
