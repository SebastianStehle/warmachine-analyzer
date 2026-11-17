import { MigrationInterface, QueryRunner } from 'typeorm';

export class ListSourceIndex1794912507429 implements MigrationInterface {
  name = 'ListSourceIndex1794912507429';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "army_lists" ADD "sourceIndex" integer NOT NULL DEFAULT '0'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "army_lists" DROP COLUMN "sourceIndex"`);
  }
}
