import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Periods now come from JamBase's `GET /quota` rather than a configured start
 * day, so each row keeps the allowance and end JamBase reported. That is what
 * lets the local counter stand in when `/quota` cannot be reached.
 */
export class LiveQuotaFromJambase1730000000000 implements MigrationInterface {
  name = "LiveQuotaFromJambase1730000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "live_quota_usage" ADD COLUMN "quota" INTEGER`
    );
    await queryRunner.query(
      `ALTER TABLE "live_quota_usage" ADD COLUMN "period_end" TEXT`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "live_quota_usage" DROP COLUMN "period_end"`
    );
    await queryRunner.query(
      `ALTER TABLE "live_quota_usage" DROP COLUMN "quota"`
    );
  }
}
