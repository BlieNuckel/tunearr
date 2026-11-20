import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * One row per user and followed artist holding the closest date they already
 * know about, so tour notifications fire once per artist and then only for a
 * closer date. The per-date notification becomes a per-artist one, so its
 * saved preferences move to the new event id.
 */
export class LiveArtistBaseline1731000000000 implements MigrationInterface {
  name = "LiveArtistBaseline1731000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_live_artist_state" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "user_id" INTEGER NOT NULL,
        "artist_mbid" TEXT NOT NULL,
        "closest_event_id" INTEGER,
        "closest_distance_km" REAL,
        "origin_lat" REAL,
        "origin_lon" REAL,
        "evaluated_at" TEXT NOT NULL,
        "notified_at" TEXT,
        "dismissed_at" TEXT,
        CONSTRAINT "uq_user_live_artist_state" UNIQUE ("user_id", "artist_mbid"),
        CONSTRAINT "fk_user_live_artist_state_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )`
    );
    await queryRunner.query(
      `UPDATE "notification_preferences" SET "event_id" = 'live.tourAnnounced'
       WHERE "event_id" = 'live.nearbyShow'`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "notification_preferences" SET "event_id" = 'live.nearbyShow'
       WHERE "event_id" = 'live.tourAnnounced'`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "user_live_artist_state"`);
  }
}
