import { jambaseGet } from "./fetch";
import { JambaseError } from "./config";
import type { JambaseQuotaResponse } from "./types";

export type JambaseQuota = {
  plan: string | null;
  /** Null when the plan has no monthly cap. */
  quota: number | null;
  usedCalls: number;
  overageCalls: number;
  periodStart: string;
  periodEnd: string;
};

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

/**
 * The account's usage for the current billing period, straight from JamBase.
 * Unmetered, so it costs nothing and is allowed even when the allowance is
 * spent.
 */
export async function fetchJambaseQuota(): Promise<JambaseQuota> {
  const body = await jambaseGet<JambaseQuotaResponse>(
    "/quota",
    {},
    { metered: false }
  );

  if (
    typeof body?.usedCalls !== "number" ||
    !isTimestamp(body.periodStart) ||
    !isTimestamp(body.periodEnd)
  ) {
    throw new JambaseError(
      "malformed",
      "JamBase /quota is missing usedCalls or the period",
      200
    );
  }

  const capped = body.noMonthlyCap !== true && typeof body.quota === "number";
  return {
    plan: typeof body.plan === "string" ? body.plan : null,
    quota: capped ? (body.quota as number) : null,
    usedCalls: body.usedCalls,
    overageCalls: typeof body.overageCalls === "number" ? body.overageCalls : 0,
    periodStart: body.periodStart,
    periodEnd: body.periodEnd,
  };
}
