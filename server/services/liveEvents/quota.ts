import { getConfig } from "../../config";
import { JambaseError, isLiveEventsConfigured } from "../../api/jambase/config";
import { setCallRecorder, setPreflightCheck } from "../../api/jambase/fetch";
import { fetchJambaseQuota } from "../../api/jambase/quota";
import type { JambaseQuota } from "../../api/jambase/quota";
import {
  findCurrentQuotaPeriod,
  getQuotaPeriod,
  incrementQuotaCalls,
  recordWarnedThreshold,
  syncQuotaPeriod,
} from "../../db/liveQuota";
import type { QuotaPeriod } from "../../db/liveQuota";
import { notifyQuotaWarning } from "../notifications";
import { createLogger } from "../../logger";

/**
 * - `jambase`: the last `/quota` check succeeded.
 * - `local`: it failed, so usage is the last JamBase figure plus our own count.
 * - `unknown`: JamBase has never answered, so there is nothing to show.
 */
export type QuotaSource = "jambase" | "local" | "unknown";

export type QuotaStatus = {
  plan: string | null;
  used: number;
  quota: number | null;
  ratio: number | null;
  overageCalls: number;
  periodStart: string | null;
  periodEnd: string | null;
  allowOverage: boolean;
  blocked: boolean;
  source: QuotaSource;
  checkedAt: string | null;
};

type RemoteState = {
  quota: JambaseQuota;
  fetchedAt: number;
};

const log = createLogger("live-quota");

const WARN_RATIO = 0.8;
const FULL_RATIO = 1;

/**
 * `/quota` is free, but a sweep makes its calls in a burst, so asking before
 * every one would double the request count for no new information. Between
 * checks our own counter covers the gap.
 */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

let remote: RemoteState | null = null;
let lastCheckFailed = false;
let inFlight: Promise<JambaseQuota | null> | null = null;
let announcing: Promise<void> = Promise.resolve();

function ratioOf(period: QuotaPeriod): number | null {
  return period.quota ? period.calls / period.quota : null;
}

function isBlocked(period: QuotaPeriod | null): boolean {
  if (getConfig().liveEvents.allowOverage) return false;
  if (!period?.quota) return false;
  return period.calls >= period.quota;
}

/**
 * Usage is a condition rather than a moment, so a naive emit would fire on every
 * check. Each threshold is announced once per billing period.
 */
async function checkCrossings(period: string, at: string): Promise<void> {
  const usage = await getQuotaPeriod(period);
  const ratio = ratioOf(usage);
  if (ratio === null) return;

  for (const threshold of [WARN_RATIO, FULL_RATIO]) {
    if (ratio < threshold) continue;
    if (usage.warnedThresholds.includes(threshold)) continue;

    await recordWarnedThreshold(period, threshold, at);
    log.warn(
      `JamBase usage crossed ${Math.round(threshold * 100)}% of ${usage.quota} (${usage.calls} calls this period)`
    );
    void notifyQuotaWarning({
      used: usage.calls,
      quota: usage.quota as number,
      ratio: threshold,
      blocked: threshold >= FULL_RATIO && isBlocked(usage),
    });
  }
}

/**
 * One check at a time: calls are recorded without waiting for each other, and
 * two checks reading "not warned yet" before either saves would warn twice.
 */
function announceCrossings(period: string, at: string): Promise<void> {
  announcing = announcing
    .then(() => checkCrossings(period, at))
    .catch((error) => log.error("Quota warning check failed", error));
  return announcing;
}

async function checkJambaseQuota(): Promise<JambaseQuota | null> {
  try {
    const quota = await fetchJambaseQuota();
    const now = new Date().toISOString();
    await syncQuotaPeriod(
      quota.periodStart,
      {
        used: quota.usedCalls,
        quota: quota.quota,
        periodEnd: quota.periodEnd,
      },
      now
    );
    remote = { quota, fetchedAt: Date.now() };
    lastCheckFailed = false;
    await announceCrossings(quota.periodStart, now);
    return quota;
  } catch (error) {
    lastCheckFailed = true;
    const kind = error instanceof JambaseError ? error.kind : "unknown";
    log.warn(`Could not read JamBase /quota (${kind}); using our own count`);
    return null;
  }
}

/** Ask JamBase for usage unless it answered recently. Concurrent asks share one call. */
async function refreshIfStale(): Promise<void> {
  if (remote && Date.now() - remote.fetchedAt < REFRESH_INTERVAL_MS) return;
  inFlight ??= checkJambaseQuota().finally(() => {
    inFlight = null;
  });
  await inFlight;
}

async function record(): Promise<void> {
  const now = new Date().toISOString();
  const current = await findCurrentQuotaPeriod(now);
  // Before JamBase has ever reported a period there is nothing to count against.
  if (!current) return;

  // 4xx responses are billable too, so every metered call counts.
  await incrementQuotaCalls(current.period, now);
  await announceCrossings(current.period, now);
}

/**
 * Refreshes even when overage is allowed: the check is also what picks up a new
 * period and keeps the 80% and 100% warnings coming.
 */
async function preflight(): Promise<void> {
  await refreshIfStale();
  const current = await findCurrentQuotaPeriod(new Date().toISOString());
  if (!isBlocked(current)) return;

  throw new JambaseError(
    "quota-exceeded",
    `The JamBase allowance of ${current?.quota} calls is spent; further calls would be billed`,
    null
  );
}

function sourceOf(current: QuotaPeriod | null): QuotaSource {
  if (remote && !lastCheckFailed) return "jambase";
  return current ? "local" : "unknown";
}

export async function getQuotaStatus(): Promise<QuotaStatus> {
  if (isLiveEventsConfigured()) await refreshIfStale();

  const current = await findCurrentQuotaPeriod(new Date().toISOString());
  const plan = remote?.quota ?? null;

  return {
    plan: plan?.plan ?? null,
    used: current?.calls ?? 0,
    quota: current?.quota ?? null,
    ratio: current ? ratioOf(current) : null,
    overageCalls: plan?.overageCalls ?? 0,
    periodStart: current?.period ?? null,
    periodEnd: current?.periodEnd ?? null,
    allowOverage: getConfig().liveEvents.allowOverage,
    blocked: isBlocked(current),
    source: sourceOf(current),
    checkedAt: remote ? new Date(remote.fetchedAt).toISOString() : null,
  };
}

/**
 * Wires counting and the guard into the client rather than into each caller,
 * so a new call site cannot forget to account for itself.
 */
export function installQuotaTracking(): void {
  setCallRecorder(() => {
    void record();
  });
  setPreflightCheck(preflight);
}

/** Forget the cached `/quota` answer so a test can start from a known state. */
export function resetQuotaCache(): void {
  remote = null;
  lastCheckFailed = false;
  inFlight = null;
  announcing = Promise.resolve();
}
