import type { MigrationInterface, QueryRunner } from "typeorm";

/** A user can dismiss a release from their Home highlights without unfollowing. */
export class FollowedReleaseDismissed1727000000000 implements MigrationInterface {
  name = "FollowedReleaseDismissed1727000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "followed_releases" ADD COLUMN "dismissed_at" TEXT`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "followed_releases" DROP COLUMN "dismissed_at"`
    );
  }
}
