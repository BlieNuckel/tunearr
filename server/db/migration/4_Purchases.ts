import type { MigrationInterface, QueryRunner } from "typeorm";

export class Purchases1712000000000 implements MigrationInterface {
  name = "Purchases1712000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "purchases" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "album_mbid" TEXT NOT NULL,
        "artist_name" TEXT NOT NULL,
        "album_title" TEXT NOT NULL,
        "price" INTEGER NOT NULL,
        "currency" TEXT NOT NULL,
        "purchased_at" TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE ("user_id", "album_mbid")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_purchase_user_id" ON "purchases"("user_id")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_purchase_album_mbid" ON "purchases"("album_mbid")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_purchase_purchased_at" ON "purchases"("purchased_at")`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "purchases"`);
  }
}
