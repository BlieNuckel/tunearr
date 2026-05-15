import type { MigrationInterface, QueryRunner } from "typeorm";

export class FollowedArtists1713000000000 implements MigrationInterface {
  name = "FollowedArtists1713000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "followed_artists" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "artist_mbid" TEXT NOT NULL,
        "artist_name" TEXT NOT NULL,
        "last_checked_at" TEXT,
        "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE ("user_id", "artist_mbid")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_followed_user_id" ON "followed_artists"("user_id")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_followed_artist_mbid" ON "followed_artists"("artist_mbid")`
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "seen_releases" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "followed_artist_id" INTEGER NOT NULL REFERENCES "followed_artists"("id") ON DELETE CASCADE,
        "release_key" TEXT NOT NULL,
        "source" TEXT NOT NULL,
        "album_title" TEXT NOT NULL,
        "release_date" TEXT,
        "external_id" TEXT,
        "notified_at" TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE ("followed_artist_id", "release_key")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_seen_followed_artist_id" ON "seen_releases"("followed_artist_id")`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "seen_releases"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "followed_artists"`);
  }
}
