import type { MigrationInterface, QueryRunner } from "typeorm";

/** Per-user filters and windows that the per-artist tour model replaced (#408). */
const DROPPED_USER_COLUMNS = [
  "live_radius_km",
  "live_regions",
  "live_announce_days",
  "live_imminent_days_local",
  "live_imminent_days_regional",
  "live_banner_enabled",
];

/**
 * Instance settings that no longer exist. Saved config keeps every key it was
 * ever written with, so they would otherwise linger and be sent to the
 * settings page forever.
 */
const DROPPED_CONFIG_PATHS = [
  "$.liveEvents.originLat",
  "$.liveEvents.originLon",
  "$.liveEvents.sweepRadiusKm",
  "$.liveEvents.regions",
  "$.liveEvents.announceDays",
  "$.liveEvents.imminentDaysLocal",
  "$.liveEvents.imminentDaysRegional",
  "$.liveEvents.fullSweepIntervalDays",
  "$.liveEvents.monthlyQuota",
  "$.liveEvents.quotaWarnRatio",
  "$.liveEvents.quotaHardStop",
  "$.liveEvents.billingPeriodStartDay",
  "$.liveEvents.shelfHorizonDays",
  "$.liveEvents.shelfMinAffinity",
];

const ORIGIN_LAT = `(SELECT json_extract("data", '$.liveEvents.originLat') FROM "config" WHERE "id" = 1)`;
const ORIGIN_LON = `(SELECT json_extract("data", '$.liveEvents.originLon') FROM "config" WHERE "id" = 1)`;

/**
 * Location becomes each user's own. Everyone without one used to fall back to
 * the instance origin, so that origin is copied onto them: nobody's dates stop
 * being measured from where they were on upgrade.
 */
export class LiveUserLocation1732000000000 implements MigrationInterface {
  name = "LiveUserLocation1732000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "live_place" TEXT`);

    await queryRunner.query(
      `UPDATE "users"
       SET "live_lat" = ${ORIGIN_LAT}, "live_lon" = ${ORIGIN_LON}
       WHERE "live_lat" IS NULL AND "live_lon" IS NULL
         AND ${ORIGIN_LAT} IS NOT NULL AND ${ORIGIN_LON} IS NOT NULL`
    );

    for (const column of DROPPED_USER_COLUMNS) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "${column}"`);
    }

    const paths = DROPPED_CONFIG_PATHS.map((path) => `'${path}'`).join(", ");
    await queryRunner.query(
      `UPDATE "config" SET "data" = json_remove("data", ${paths}) WHERE "id" = 1`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of [
      `"live_radius_km" INTEGER`,
      `"live_regions" TEXT`,
      `"live_announce_days" INTEGER`,
      `"live_imminent_days_local" INTEGER`,
      `"live_imminent_days_regional" INTEGER`,
      `"live_banner_enabled" BOOLEAN`,
    ]) {
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN ${column}`);
    }
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "live_place"`);
  }
}
