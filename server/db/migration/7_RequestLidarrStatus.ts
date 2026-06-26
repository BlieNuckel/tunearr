import type { MigrationInterface, QueryRunner } from "typeorm";

export class RequestLidarrStatus1715000000000 implements MigrationInterface {
  name = "RequestLidarrStatus1715000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "requests" ADD COLUMN "lidarr_status" TEXT`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_requests_lidarr_status" ON "requests" ("lidarr_status")`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_requests_lidarr_status"`);
    await queryRunner.query(
      `ALTER TABLE "requests" DROP COLUMN "lidarr_status"`
    );
  }
}
