import { MigrationInterface, QueryRunner } from 'typeorm';

export class Settings1795019400346 implements MigrationInterface {
  name = 'Settings1795019400346';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "settings" ("key" character varying(100) NOT NULL, "value" character varying(500) NOT NULL, CONSTRAINT "PK_c8639b7626fa94ba8265628f214" PRIMARY KEY ("key"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "settings"`);
  }
}
