import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Repository } from 'typeorm';
import { ArmyListEntity } from './army-list';
import { ShopProductEntity } from './shop-product';

export type ListProductRepository = Repository<ListProductEntity>;

@Entity({ name: 'list_products' })
export class ListProductEntity {
  @PrimaryColumn('int')
  listId: number;

  @ManyToOne(() => ArmyListEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listId' })
  list: ArmyListEntity;

  @PrimaryColumn('int')
  productId: number;

  @ManyToOne(() => ShopProductEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: ShopProductEntity;

  @Column('int')
  quantity: number;
}
