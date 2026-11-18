import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * When a request's album reached the library, so Home can tell the requester,
 * and when they dismissed that news.
 */
export class RequestAvailable1728000000000 implements MigrationInterface {
  name = "RequestAvailable1728000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "requests" ADD COLUMN "available_at" TEXT`
    );
    await queryRunner.query(
      `ALTER TABLE "requests" ADD COLUMN "highlight_dismissed_at" TEXT`
    );
    // An imported request is never written again, so its last update is when it arrived.
    await queryRunner.query(
      `UPDATE "requests"
       SET "available_at" = strftime('%Y-%m-%dT%H:%M:%fZ', "updated_at")
       WHERE "lidarr_status" = 'imported'`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "requests" DROP COLUMN "highlight_dismissed_at"`
    );
    await queryRunner.query(
      `ALTER TABLE "requests" DROP COLUMN "available_at"`
    );
  }
}
