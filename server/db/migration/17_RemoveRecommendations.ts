import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The recommenders are gone, and with them everything only they read: the derived
 * taste profile, the persisted spotlight carousel, the performer genres the nearby
 * shelf ranked on, and the `plex_plays` series the profile stopped folding long ago.
 * The rest of `user_signal_events` stays, since it is the captured Plex history.
 *
 * `down` restores the schema but not the data. Profiles and carousels were derived
 * and nothing would rebuild them, the genres return on the next full roster sweep,
 * and the `plex_plays` rows are deleted for good.
 */
export class RemoveRecommendations1725000000000 implements MigrationInterface {
  name = "RemoveRecommendations1725000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "promoted_album_snapshots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_profiles"`);
    await queryRunner.query(
      `DELETE FROM "user_signal_events" WHERE "kind" = 'plex_plays'`
    );
    await queryRunner.query(
      `ALTER TABLE "live_event_performers" DROP COLUMN "genres"`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "live_event_performers" ADD COLUMN "genres" TEXT`
    );

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
      CREATE TABLE IF NOT EXISTS "promoted_album_snapshots" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "albums_json" TEXT NOT NULL,
        "target_count" INTEGER NOT NULL,
        "built_at" TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_promoted_album_snapshots_user_id" ON "promoted_album_snapshots"("user_id")`
    );
  }
}
