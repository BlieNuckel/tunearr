import type { MigrationInterface, QueryRunner } from "typeorm";

export class ConfigTable1710000000000 implements MigrationInterface {
  name = "ConfigTable1710000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "config" (
        "id" INTEGER PRIMARY KEY,
        "data" TEXT NOT NULL DEFAULT '{}'
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "config"`);
  }
}
