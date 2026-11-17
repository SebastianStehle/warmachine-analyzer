import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1794946020075 implements MigrationInterface {
  name = 'Init1794946020075';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "factions" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, CONSTRAINT "UQ_fc85e9df109b8cc859ed76e1cd3" UNIQUE ("name"), CONSTRAINT "PK_f72b0b6ddf66927468c7f0f2cee" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "armies" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "factionId" integer, "wikiIndex" character varying(200) NOT NULL, CONSTRAINT "UQ_fd6e4e4bd6a6a451baed1f8cbdc" UNIQUE ("name"), CONSTRAINT "PK_3453ee222784ace63ebc551fccf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "events" ("id" integer NOT NULL, "name" character varying(200) NOT NULL, "date" character varying(10) NOT NULL, "location" character varying(300), "type" character varying(100), "playerCount" integer NOT NULL, "rounds" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "models" ("id" SERIAL NOT NULL, "name" character varying(200) NOT NULL, "type" character varying(30), "wikiPage" character varying(200), "aliases" text NOT NULL, CONSTRAINT "UQ_3492c71396207453cf17c0928fb" UNIQUE ("name"), CONSTRAINT "PK_ef9ed7160ea69013636466bf2d5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "players" ("id" integer NOT NULL, "name" character varying(200) NOT NULL, CONSTRAINT "PK_de22b8fdeee0c33ab55ae71da3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "army_lists" ("id" SERIAL NOT NULL, "eventId" integer NOT NULL, "playerId" integer NOT NULL, "sourceId" integer NOT NULL, "sourceIndex" integer NOT NULL DEFAULT '0', "title" character varying(200) NOT NULL, "armyId" integer NOT NULL, "casterId" integer, "format" character varying(100), "pointLevel" integer, "totalPoints" integer, "price" integer, "unpricedModels" integer NOT NULL DEFAULT '0', "commandCards" text NOT NULL, "warnings" text NOT NULL, "rawText" text NOT NULL, CONSTRAINT "PK_bad26759b47753a042a36b62c91" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_9ceb01260501492f4756b76e8e" ON "army_lists" ("eventId") `);
    await queryRunner.query(`CREATE INDEX "IDX_578d44d999f2acbfc7214d1c97" ON "army_lists" ("playerId") `);
    await queryRunner.query(`CREATE INDEX "IDX_5926242419db67f309e857befa" ON "army_lists" ("armyId") `);
    await queryRunner.query(`CREATE INDEX "IDX_faf9071ccfa94372e76925f545" ON "army_lists" ("casterId") `);
    await queryRunner.query(`CREATE INDEX "IDX_6e635ea3fe72bb19c8fb4da330" ON "army_lists" ("price") `);
    await queryRunner.query(
      `CREATE TABLE "army_models" ("armyId" integer NOT NULL, "modelId" integer NOT NULL, "isMercenary" boolean NOT NULL, CONSTRAINT "PK_f62017f73dc44006235a9d86e2e" PRIMARY KEY ("armyId", "modelId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "games" ("id" integer NOT NULL, "eventId" integer NOT NULL, "round" integer NOT NULL, "table" integer, "scenario" character varying(100), "isBye" boolean NOT NULL, CONSTRAINT "PK_c9b16b62917b5595af982d66337" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_a01657501487cde4bc2c8f7d57" ON "games" ("eventId") `);
    await queryRunner.query(
      `CREATE TABLE "game_players" ("id" SERIAL NOT NULL, "gameId" integer NOT NULL, "playerId" integer NOT NULL, "opponentId" integer, "armyId" integer, "opponentArmyId" integer, "casterId" integer, "opponentCasterId" integer, "listId" integer, "result" character varying(10) NOT NULL, "controlPoints" integer, "armyPoints" integer, CONSTRAINT "PK_a99af25a1c97122f04ba778197c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_66d478167a4c11e2ad1ba74e52" ON "game_players" ("gameId") `);
    await queryRunner.query(`CREATE INDEX "IDX_58e348072733ba21f07f4feca2" ON "game_players" ("playerId") `);
    await queryRunner.query(`CREATE INDEX "IDX_312074bb2615afdb40d3335ecf" ON "game_players" ("opponentId") `);
    await queryRunner.query(`CREATE INDEX "IDX_7d0cfc73e260a3181b4b1fbb98" ON "game_players" ("armyId") `);
    await queryRunner.query(`CREATE INDEX "IDX_f9b0e0db53e09d9a40ed42fc61" ON "game_players" ("opponentArmyId") `);
    await queryRunner.query(`CREATE INDEX "IDX_785698edccf44843b13f0ee98f" ON "game_players" ("casterId") `);
    await queryRunner.query(`CREATE INDEX "IDX_74ec90d5a4f726deaf413b3dc3" ON "game_players" ("listId") `);
    await queryRunner.query(
      `CREATE TABLE "list_entries" ("id" SERIAL NOT NULL, "listId" integer NOT NULL, "position" integer NOT NULL, "name" character varying(200) NOT NULL, "baseName" character varying(200) NOT NULL, "points" integer, "depth" integer NOT NULL, "kind" character varying(20) NOT NULL, "modelId" integer, CONSTRAINT "PK_66f5d60c378af8447e6b01a0bf1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_a9edbe0db3374a3168fc78b6f2" ON "list_entries" ("listId") `);
    await queryRunner.query(`CREATE INDEX "IDX_518393ec7886cdaa58183797f5" ON "list_entries" ("baseName") `);
    await queryRunner.query(`CREATE INDEX "IDX_18e4260c991b6f50db4a9668fe" ON "list_entries" ("modelId") `);
    await queryRunner.query(
      `CREATE TABLE "shop_products" ("id" SERIAL NOT NULL, "shopId" character varying(30) NOT NULL, "title" character varying(300) NOT NULL, "url" character varying(500) NOT NULL, "price" integer NOT NULL, "currency" character varying(3) NOT NULL, "available" boolean NOT NULL, "imageUrl" character varying(500), CONSTRAINT "UQ_98b764d1f5411357cb5d50b8bba" UNIQUE ("shopId"), CONSTRAINT "PK_bc7b9a757fadb6a6b0e5cc4bf7e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "list_products" ("listId" integer NOT NULL, "productId" integer NOT NULL, "quantity" integer NOT NULL, CONSTRAINT "PK_27c743a8b8e8f7aa1ab45541f1c" PRIMARY KEY ("listId", "productId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "pages" ("url" character varying(500) NOT NULL, "body" text NOT NULL, "fetchedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_77f2f5a2fd954fd1ab0d13f5d2c" PRIMARY KEY ("url"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "participants" ("id" SERIAL NOT NULL, "eventId" integer NOT NULL, "playerId" integer NOT NULL, "rank" integer NOT NULL, "armyId" integer, "tournamentPoints" integer NOT NULL, "wins" integer NOT NULL, "losses" integer NOT NULL, "strengthOfSchedule" integer, "controlPoints" integer, "armyPoints" integer, CONSTRAINT "PK_1cda06c31eec1c95b3365a0283f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_ed49a1d43654faefa32e217a7f" ON "participants" ("playerId") `);
    await queryRunner.query(`CREATE INDEX "IDX_5759de208d78d45040c19a6f7b" ON "participants" ("armyId") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0af412771b69be6539624ad83f" ON "participants" ("eventId", "playerId") `);
    await queryRunner.query(
      `CREATE TABLE "shop_product_models" ("productId" integer NOT NULL, "modelId" integer NOT NULL, "quantity" integer NOT NULL, CONSTRAINT "PK_65f28f792ffa57267ea57bc6e00" PRIMARY KEY ("productId", "modelId"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "armies" ADD CONSTRAINT "FK_e77f193e820598596608c036887" FOREIGN KEY ("factionId") REFERENCES "factions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "army_lists" ADD CONSTRAINT "FK_9ceb01260501492f4756b76e8ed" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "army_lists" ADD CONSTRAINT "FK_578d44d999f2acbfc7214d1c973" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "army_lists" ADD CONSTRAINT "FK_5926242419db67f309e857befac" FOREIGN KEY ("armyId") REFERENCES "armies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "army_lists" ADD CONSTRAINT "FK_faf9071ccfa94372e76925f545f" FOREIGN KEY ("casterId") REFERENCES "models"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "army_models" ADD CONSTRAINT "FK_235cfd28577a8a565746fdc1038" FOREIGN KEY ("armyId") REFERENCES "armies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "army_models" ADD CONSTRAINT "FK_bd3cfaa906a4ab5fb0fcd2b1b87" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" ADD CONSTRAINT "FK_a01657501487cde4bc2c8f7d574" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_players" ADD CONSTRAINT "FK_66d478167a4c11e2ad1ba74e52f" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_players" ADD CONSTRAINT "FK_58e348072733ba21f07f4feca2f" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_players" ADD CONSTRAINT "FK_312074bb2615afdb40d3335ecfc" FOREIGN KEY ("opponentId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_players" ADD CONSTRAINT "FK_7d0cfc73e260a3181b4b1fbb984" FOREIGN KEY ("armyId") REFERENCES "armies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_players" ADD CONSTRAINT "FK_f9b0e0db53e09d9a40ed42fc612" FOREIGN KEY ("opponentArmyId") REFERENCES "armies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_players" ADD CONSTRAINT "FK_785698edccf44843b13f0ee98fc" FOREIGN KEY ("casterId") REFERENCES "models"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_players" ADD CONSTRAINT "FK_d112ea82139b18fea2a85fdba15" FOREIGN KEY ("opponentCasterId") REFERENCES "models"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_players" ADD CONSTRAINT "FK_74ec90d5a4f726deaf413b3dc36" FOREIGN KEY ("listId") REFERENCES "army_lists"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "list_entries" ADD CONSTRAINT "FK_a9edbe0db3374a3168fc78b6f21" FOREIGN KEY ("listId") REFERENCES "army_lists"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "list_entries" ADD CONSTRAINT "FK_18e4260c991b6f50db4a9668fe3" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "list_products" ADD CONSTRAINT "FK_0d15448fa2228eb9b29a6fa93a8" FOREIGN KEY ("listId") REFERENCES "army_lists"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "list_products" ADD CONSTRAINT "FK_27bef3a918d04e6ec167de5ac1e" FOREIGN KEY ("productId") REFERENCES "shop_products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "participants" ADD CONSTRAINT "FK_a622804301e735196918e6a47e5" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "participants" ADD CONSTRAINT "FK_ed49a1d43654faefa32e217a7f5" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "participants" ADD CONSTRAINT "FK_5759de208d78d45040c19a6f7b9" FOREIGN KEY ("armyId") REFERENCES "armies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_product_models" ADD CONSTRAINT "FK_428523d464ab25ad1f4753bb1ee" FOREIGN KEY ("productId") REFERENCES "shop_products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_product_models" ADD CONSTRAINT "FK_7f05d1c302bd5adc1db8f4e6558" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shop_product_models" DROP CONSTRAINT "FK_7f05d1c302bd5adc1db8f4e6558"`);
    await queryRunner.query(`ALTER TABLE "shop_product_models" DROP CONSTRAINT "FK_428523d464ab25ad1f4753bb1ee"`);
    await queryRunner.query(`ALTER TABLE "participants" DROP CONSTRAINT "FK_5759de208d78d45040c19a6f7b9"`);
    await queryRunner.query(`ALTER TABLE "participants" DROP CONSTRAINT "FK_ed49a1d43654faefa32e217a7f5"`);
    await queryRunner.query(`ALTER TABLE "participants" DROP CONSTRAINT "FK_a622804301e735196918e6a47e5"`);
    await queryRunner.query(`ALTER TABLE "list_products" DROP CONSTRAINT "FK_27bef3a918d04e6ec167de5ac1e"`);
    await queryRunner.query(`ALTER TABLE "list_products" DROP CONSTRAINT "FK_0d15448fa2228eb9b29a6fa93a8"`);
    await queryRunner.query(`ALTER TABLE "list_entries" DROP CONSTRAINT "FK_18e4260c991b6f50db4a9668fe3"`);
    await queryRunner.query(`ALTER TABLE "list_entries" DROP CONSTRAINT "FK_a9edbe0db3374a3168fc78b6f21"`);
    await queryRunner.query(`ALTER TABLE "game_players" DROP CONSTRAINT "FK_74ec90d5a4f726deaf413b3dc36"`);
    await queryRunner.query(`ALTER TABLE "game_players" DROP CONSTRAINT "FK_d112ea82139b18fea2a85fdba15"`);
    await queryRunner.query(`ALTER TABLE "game_players" DROP CONSTRAINT "FK_785698edccf44843b13f0ee98fc"`);
    await queryRunner.query(`ALTER TABLE "game_players" DROP CONSTRAINT "FK_f9b0e0db53e09d9a40ed42fc612"`);
    await queryRunner.query(`ALTER TABLE "game_players" DROP CONSTRAINT "FK_7d0cfc73e260a3181b4b1fbb984"`);
    await queryRunner.query(`ALTER TABLE "game_players" DROP CONSTRAINT "FK_312074bb2615afdb40d3335ecfc"`);
    await queryRunner.query(`ALTER TABLE "game_players" DROP CONSTRAINT "FK_58e348072733ba21f07f4feca2f"`);
    await queryRunner.query(`ALTER TABLE "game_players" DROP CONSTRAINT "FK_66d478167a4c11e2ad1ba74e52f"`);
    await queryRunner.query(`ALTER TABLE "games" DROP CONSTRAINT "FK_a01657501487cde4bc2c8f7d574"`);
    await queryRunner.query(`ALTER TABLE "army_models" DROP CONSTRAINT "FK_bd3cfaa906a4ab5fb0fcd2b1b87"`);
    await queryRunner.query(`ALTER TABLE "army_models" DROP CONSTRAINT "FK_235cfd28577a8a565746fdc1038"`);
    await queryRunner.query(`ALTER TABLE "army_lists" DROP CONSTRAINT "FK_faf9071ccfa94372e76925f545f"`);
    await queryRunner.query(`ALTER TABLE "army_lists" DROP CONSTRAINT "FK_5926242419db67f309e857befac"`);
    await queryRunner.query(`ALTER TABLE "army_lists" DROP CONSTRAINT "FK_578d44d999f2acbfc7214d1c973"`);
    await queryRunner.query(`ALTER TABLE "army_lists" DROP CONSTRAINT "FK_9ceb01260501492f4756b76e8ed"`);
    await queryRunner.query(`ALTER TABLE "armies" DROP CONSTRAINT "FK_e77f193e820598596608c036887"`);
    await queryRunner.query(`DROP TABLE "shop_product_models"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0af412771b69be6539624ad83f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5759de208d78d45040c19a6f7b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ed49a1d43654faefa32e217a7f"`);
    await queryRunner.query(`DROP TABLE "participants"`);
    await queryRunner.query(`DROP TABLE "pages"`);
    await queryRunner.query(`DROP TABLE "list_products"`);
    await queryRunner.query(`DROP TABLE "shop_products"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_18e4260c991b6f50db4a9668fe"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_518393ec7886cdaa58183797f5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a9edbe0db3374a3168fc78b6f2"`);
    await queryRunner.query(`DROP TABLE "list_entries"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_74ec90d5a4f726deaf413b3dc3"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_785698edccf44843b13f0ee98f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f9b0e0db53e09d9a40ed42fc61"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7d0cfc73e260a3181b4b1fbb98"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_312074bb2615afdb40d3335ecf"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_58e348072733ba21f07f4feca2"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_66d478167a4c11e2ad1ba74e52"`);
    await queryRunner.query(`DROP TABLE "game_players"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a01657501487cde4bc2c8f7d57"`);
    await queryRunner.query(`DROP TABLE "games"`);
    await queryRunner.query(`DROP TABLE "army_models"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6e635ea3fe72bb19c8fb4da330"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_faf9071ccfa94372e76925f545"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5926242419db67f309e857befa"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_578d44d999f2acbfc7214d1c97"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9ceb01260501492f4756b76e8e"`);
    await queryRunner.query(`DROP TABLE "army_lists"`);
    await queryRunner.query(`DROP TABLE "players"`);
    await queryRunner.query(`DROP TABLE "models"`);
    await queryRunner.query(`DROP TABLE "events"`);
    await queryRunner.query(`DROP TABLE "armies"`);
    await queryRunner.query(`DROP TABLE "factions"`);
  }
}
