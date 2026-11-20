import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Moves JamBase resolution off each user's follow row into one row per artist,
 * so a second follower does not trigger a second lookup and the answer
 * survives everyone unfollowing.
 */
export class LiveArtists1729000000000 implements MigrationInterface {
  name = "LiveArtists1729000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "live_artists" (
        "artist_mbid" TEXT PRIMARY KEY NOT NULL,
        "jambase_artist_id" TEXT,
        "resolved_at" TEXT NOT NULL
      )`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_live_artists_jambase_artist_id"
       ON "live_artists"("jambase_artist_id")`
    );

    // MAX() collapses the per-follow copies: a found id beats another
    // follower's unattempted row, and a recorded miss is kept as a miss.
    await queryRunner.query(
      `INSERT INTO "live_artists" ("artist_mbid", "jambase_artist_id", "resolved_at")
       SELECT "artist_mbid",
              MAX("jambase_artist_id"),
              COALESCE(MAX("jambase_resolved_at"), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       FROM "followed_artists"
       WHERE "jambase_artist_id" IS NOT NULL OR "jambase_resolved_at" IS NOT NULL
       GROUP BY "artist_mbid"`
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_followed_jambase_artist_id"`
    );
    await queryRunner.query(
      `ALTER TABLE "followed_artists" DROP COLUMN "jambase_resolved_at"`
    );
    await queryRunner.query(
      `ALTER TABLE "followed_artists" DROP COLUMN "jambase_artist_id"`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "followed_artists" ADD COLUMN "jambase_artist_id" TEXT`
    );
    await queryRunner.query(
      `ALTER TABLE "followed_artists" ADD COLUMN "jambase_resolved_at" TEXT`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_followed_jambase_artist_id"
       ON "followed_artists"("jambase_artist_id")`
    );
    await queryRunner.query(
      `UPDATE "followed_artists"
       SET "jambase_artist_id" = (
             SELECT "jambase_artist_id" FROM "live_artists"
             WHERE "live_artists"."artist_mbid" = "followed_artists"."artist_mbid"
           ),
           "jambase_resolved_at" = (
             SELECT "resolved_at" FROM "live_artists"
             WHERE "live_artists"."artist_mbid" = "followed_artists"."artist_mbid"
           )`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_live_artists_jambase_artist_id"`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "live_artists"`);
  }
}
