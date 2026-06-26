import { syncRequestStatuses } from "./statusSync";
import { createLogger } from "../../logger";

const log = createLogger("request-status-poller");

const DEFAULT_INTERVAL_MS = 2 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 15 * 1000;

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;

export async function runStatusSyncOnce(): Promise<void> {
  if (running) {
    log.warn("Status sync already running, skipping this tick");
    return;
  }
  running = true;
  try {
    await syncRequestStatuses();
  } finally {
    running = false;
  }
}

export function startRequestStatusPoller(
  intervalMs: number = DEFAULT_INTERVAL_MS
): void {
  if (timer) return;

  const tick = async () => {
    try {
      await runStatusSyncOnce();
    } catch (error) {
      log.error("Status sync tick failed", error);
    } finally {
      timer = setTimeout(tick, intervalMs);
    }
  };

  timer = setTimeout(tick, FIRST_RUN_DELAY_MS);
  log.info(`Request status poller scheduled (interval: ${intervalMs / 1000}s)`);
}

export function stopRequestStatusPoller(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}
