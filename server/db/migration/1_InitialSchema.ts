import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1709000000000 implements MigrationInterface {
  name = "InitialSchema1709000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "username" TEXT UNIQUE,
        "password_hash" TEXT,
        "plex_id" TEXT UNIQUE,
        "plex_email" TEXT,
        "plex_thumb" TEXT,
        "role" TEXT NOT NULL DEFAULT 'user' CHECK ("role" IN ('admin', 'user')),
        "enabled" INTEGER NOT NULL DEFAULT 1 CHECK ("enabled" IN (0, 1)),
        "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
        "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
        "theme" TEXT NOT NULL DEFAULT 'system' CHECK ("theme" IN ('light', 'dark', 'system')),
        "plex_username" TEXT,
        "user_type" TEXT NOT NULL DEFAULT 'local' CHECK ("user_type" IN ('local', 'plex'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "token" TEXT NOT NULL UNIQUE,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "expires_at" TEXT NOT NULL,
        "created_at" TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_sessions_token" ON "sessions"("token")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "sessions"("user_id")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_sessions_expires_at" ON "sessions"("expires_at")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_users_plex_id" ON "users"("plex_id")`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
