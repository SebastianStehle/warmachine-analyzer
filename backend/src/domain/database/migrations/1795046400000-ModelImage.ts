import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModelImage1795046400000 implements MigrationInterface {
  name = 'ModelImage1795046400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "models" ADD "imageUrl" character varying(500)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "models" DROP COLUMN "imageUrl"`);
  }
}
