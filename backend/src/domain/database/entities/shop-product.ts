import { Column, Entity, PrimaryGeneratedColumn, Repository } from 'typeorm';

export type ShopProductRepository = Repository<ShopProductEntity>;

@Entity({ name: 'shop_products' })
export class ShopProductEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 30, unique: true })
  shopId: string;

  @Column('varchar', { length: 300 })
  title: string;

  @Column('varchar', { length: 500 })
  url: string;

  // In cents, to avoid rounding errors when prices are added up.
  @Column('int')
  price: number;

  @Column('varchar', { length: 3 })
  currency: string;

  @Column('boolean')
  available: boolean;

  @Column('varchar', { length: 500, nullable: true })
  imageUrl: string | null;
}
