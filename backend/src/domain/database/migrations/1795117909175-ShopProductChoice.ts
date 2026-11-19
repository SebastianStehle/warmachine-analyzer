import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShopProductChoice1795117909175 implements MigrationInterface {
  name = 'ShopProductChoice1795117909175';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shop_product_models" ADD "choice" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shop_product_models" DROP COLUMN "choice"`);
  }
}
