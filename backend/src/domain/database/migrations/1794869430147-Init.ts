import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1794869430147 implements MigrationInterface {
  name = 'Init1794869430147';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "army_lists" ("id" SERIAL NOT NULL, "eventId" integer NOT NULL, "playerId" integer NOT NULL, "sourceId" integer NOT NULL, "title" character varying(200) NOT NULL, "faction" character varying(100), "army" character varying(100), "caster" character varying(200), "format" character varying(100), "pointLevel" integer, "totalPoints" integer, "commandCards" text NOT NULL, "warnings" text NOT NULL, "rawText" text NOT NULL, CONSTRAINT "PK_bad26759b47753a042a36b62c91" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_9ceb01260501492f4756b76e8e" ON "army_lists" ("eventId") `);
    await queryRunner.query(`CREATE INDEX "IDX_e1d8268a40432c9cc28f64a558" ON "army_lists" ("army") `);
    await queryRunner.query(
      `CREATE TABLE "events" ("id" integer NOT NULL, "name" character varying(200) NOT NULL, "date" character varying(10) NOT NULL, "location" character varying(300), "type" character varying(100), "playerCount" integer NOT NULL, "rounds" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "games" ("id" integer NOT NULL, "eventId" integer NOT NULL, "round" integer NOT NULL, "table" integer, "scenario" character varying(100), "isBye" boolean NOT NULL, CONSTRAINT "PK_c9b16b62917b5595af982d66337" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_a01657501487cde4bc2c8f7d57" ON "games" ("eventId") `);
    await queryRunner.query(
      `CREATE TABLE "game_players" ("id" SERIAL NOT NULL, "gameId" integer NOT NULL, "eventId" integer NOT NULL, "playerId" integer NOT NULL, "opponentId" integer, "army" character varying(100), "opponentArmy" character varying(100), "caster" character varying(200), "opponentCaster" character varying(200), "listId" integer, "result" character varying(10) NOT NULL, "controlPoints" integer, "armyPoints" integer, CONSTRAINT "PK_a99af25a1c97122f04ba778197c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_66d478167a4c11e2ad1ba74e52" ON "game_players" ("gameId") `);
    await queryRunner.query(`CREATE INDEX "IDX_d1b5cff3a3d1f4a27ca6988991" ON "game_players" ("eventId") `);
    await queryRunner.query(`CREATE INDEX "IDX_74e0b21e25662c866c32f19d5c" ON "game_players" ("army") `);
    await queryRunner.query(`CREATE INDEX "IDX_74ec90d5a4f726deaf413b3dc3" ON "game_players" ("listId") `);
    await queryRunner.query(
      `CREATE TABLE "list_entries" ("id" SERIAL NOT NULL, "listId" integer NOT NULL, "eventId" integer NOT NULL, "position" integer NOT NULL, "name" character varying(200) NOT NULL, "baseName" character varying(200) NOT NULL, "points" integer, "depth" integer NOT NULL, "kind" character varying(20) NOT NULL, CONSTRAINT "PK_66f5d60c378af8447e6b01a0bf1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_a9edbe0db3374a3168fc78b6f2" ON "list_entries" ("listId") `);
    await queryRunner.query(`CREATE INDEX "IDX_6406222a75975e2310e508004a" ON "list_entries" ("eventId") `);
    await queryRunner.query(`CREATE INDEX "IDX_518393ec7886cdaa58183797f5" ON "list_entries" ("baseName") `);
    await queryRunner.query(
      `CREATE TABLE "pages" ("url" character varying(500) NOT NULL, "body" text NOT NULL, "fetchedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_77f2f5a2fd954fd1ab0d13f5d2c" PRIMARY KEY ("url"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "participants" ("id" SERIAL NOT NULL, "eventId" integer NOT NULL, "playerId" integer NOT NULL, "rank" integer NOT NULL, "army" character varying(100), "faction" character varying(100), "tournamentPoints" integer NOT NULL, "wins" integer NOT NULL, "losses" integer NOT NULL, "strengthOfSchedule" integer, "controlPoints" integer, "armyPoints" integer, CONSTRAINT "PK_1cda06c31eec1c95b3365a0283f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0af412771b69be6539624ad83f" ON "participants" ("eventId", "playerId") `);
    await queryRunner.query(
      `CREATE TABLE "players" ("id" integer NOT NULL, "name" character varying(200) NOT NULL, CONSTRAINT "PK_de22b8fdeee0c33ab55ae71da3b" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "players"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0af412771b69be6539624ad83f"`);
    await queryRunner.query(`DROP TABLE "participants"`);
    await queryRunner.query(`DROP TABLE "pages"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_518393ec7886cdaa58183797f5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6406222a75975e2310e508004a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a9edbe0db3374a3168fc78b6f2"`);
    await queryRunner.query(`DROP TABLE "list_entries"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_74ec90d5a4f726deaf413b3dc3"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_74e0b21e25662c866c32f19d5c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d1b5cff3a3d1f4a27ca6988991"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_66d478167a4c11e2ad1ba74e52"`);
    await queryRunner.query(`DROP TABLE "game_players"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a01657501487cde4bc2c8f7d57"`);
    await queryRunner.query(`DROP TABLE "games"`);
    await queryRunner.query(`DROP TABLE "events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e1d8268a40432c9cc28f64a558"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9ceb01260501492f4756b76e8e"`);
    await queryRunner.query(`DROP TABLE "army_lists"`);
  }
}
