import type { MigrationInterface, QueryRunner } from "typeorm";

export class RenamePlexPlays1717000000000 implements MigrationInterface {
  name = "RenamePlexPlays1717000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "user_signal_events" SET "kind" = 'plex_plays' WHERE "kind" = 'snapshot'`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "user_signal_events" SET "kind" = 'snapshot' WHERE "kind" = 'plex_plays'`
    );
  }
}
