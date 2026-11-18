import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Purchases belong to a user, so the currency and monthly limit they are
 * measured against do too. A null currency means the user hasn't set up
 * purchases yet. Users who already recorded purchases keep what the instance
 * had, so their summaries don't change on upgrade; everyone else starts with
 * none, since the old config saved its defaults and can't tell a choice from
 * them. The instance-wide value is then removed from the config.
 *
 * `down` puts the first set-up user's values back as the instance setting,
 * since one value has to win and the first user is the one who set up the install.
 */
export class UserSpending1726000000000 implements MigrationInterface {
  name = "UserSpending1726000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "spending_currency" TEXT`
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "spending_monthly_limit" INTEGER`
    );

    await queryRunner.query(`
      UPDATE "users" SET
        "spending_currency" = COALESCE(
          (SELECT json_extract("data", '$.spending.currency') FROM "config" WHERE "id" = 1),
          'USD'
        ),
        "spending_monthly_limit" =
          (SELECT json_extract("data", '$.spending.monthlyLimit') FROM "config" WHERE "id" = 1)
      WHERE "id" IN (SELECT DISTINCT "user_id" FROM "purchases")
    `);
    await queryRunner.query(
      `UPDATE "config" SET "data" = json_remove("data", '$.spending') WHERE "id" = 1`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "config" SET "data" = json_set(
        "data",
        '$.spending',
        json_object(
          'currency', "first"."spending_currency",
          'monthlyLimit', "first"."spending_monthly_limit"
        )
      )
      FROM (
        SELECT "spending_currency", "spending_monthly_limit" FROM "users"
        WHERE "spending_currency" IS NOT NULL ORDER BY "id" LIMIT 1
      ) AS "first"
      WHERE "config"."id" = 1
    `);

    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "spending_monthly_limit"`
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "spending_currency"`
    );
  }
}
