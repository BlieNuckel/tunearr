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
        "permissions" INTEGER NOT NULL DEFAULT 8,
        "enabled" INTEGER NOT NULL DEFAULT 1 CHECK ("enabled" IN (0, 1)),
        "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
        "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
        "theme" TEXT NOT NULL DEFAULT 'system' CHECK ("theme" IN ('light', 'dark', 'system')),
        "plex_username" TEXT,
        "plex_token" TEXT,
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

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "requests" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "album_mbid" TEXT NOT NULL,
        "artist_name" TEXT NOT NULL,
        "album_title" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'approved', 'declined')),
        "approved_by" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
        "approved_at" TEXT,
        "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
        "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_requests_user_id" ON "requests"("user_id")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_requests_album_mbid" ON "requests"("album_mbid")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_requests_status" ON "requests"("status")`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
