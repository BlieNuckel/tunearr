import type { MigrationInterface, QueryRunner } from "typeorm";

export class FollowedLastViewedAt1714000000000 implements MigrationInterface {
  name = "FollowedLastViewedAt1714000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "followed_last_viewed_at" TEXT`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "followed_last_viewed_at"`
    );
  }
}
