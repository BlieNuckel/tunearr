import { Entity, PrimaryGeneratedColumn, Column, Unique } from "typeorm";

/**
 * One row per billing period. A counter in the config row would mean rewriting
 * that JSON on every API call, which is why this is a table.
 *
 * `warned_thresholds` persists which alerts have already fired so a restart
 * cannot make the instance shout about the same threshold twice.
 */
@Entity("live_quota_usage")
@Unique("uq_live_quota_usage_period", ["period"])
export class LiveQuotaUsage {
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * Billing period key: the `periodStart` JamBase reports. Rows from before
   * that are keyed `YYYY-MM` and have no `period_end`, so they are never
   * current again.
   */
  @Column({ type: "text" })
  period!: string;

  /** JamBase's `usedCalls` at the last sync, plus our calls since. */
  @Column({ type: "integer", default: 0 })
  calls!: number;

  /** The plan allowance; null when the plan has no monthly cap. */
  @Column({ type: "integer", nullable: true })
  quota!: number | null;

  @Column({ type: "text", nullable: true })
  period_end!: string | null;

  /** JSON-encoded number[] of ratio thresholds already announced this period. */
  @Column({ type: "text", nullable: true })
  warned_thresholds!: string | null;

  @Column({ type: "text" })
  updated_at!: string;
}
