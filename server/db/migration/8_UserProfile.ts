import type { MigrationInterface, QueryRunner } from "typeorm";

export class UserProfile1716000000000 implements MigrationInterface {
  name = "UserProfile1716000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_profiles" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "profile_json" TEXT NOT NULL,
        "schema_version" INTEGER NOT NULL,
        "config_hash" TEXT NOT NULL,
        "generated_at" TEXT NOT NULL DEFAULT (datetime('now')),
        "last_used_at" TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_profiles_user_id" ON "user_profiles"("user_id")`
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_signal_events" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "kind" TEXT NOT NULL,
        "payload" TEXT NOT NULL,
        "recorded_at" TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_user_signal_events_user_id" ON "user_signal_events"("user_id")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_user_signal_events_kind" ON "user_signal_events"("kind")`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_signal_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_profiles"`);
  }
}
