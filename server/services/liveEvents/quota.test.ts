import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DEFAULT_LIVE_EVENTS } from "../../../shared/settingsDefaults";
import type { QuotaPeriod, QuotaSnapshot } from "../../db/liveQuota";

const mockGetConfig = vi.fn();
const mockIsConfigured = vi.fn();
const mockFetchQuota = vi.fn();
const mockNotify = vi.fn();
const mockSetCallRecorder = vi.fn();
const mockSetPreflight = vi.fn();

const periods = new Map<string, QuotaPeriod>();

function emptyPeriod(period: string): QuotaPeriod {
  return {
    period,
    calls: 0,
    quota: null,
    periodEnd: null,
    warnedThresholds: [],
  };
}

vi.mock("../../config", () => ({
  getConfig: () => mockGetConfig(),
}));

vi.mock("../../api/jambase/config", async () => {
  const actual = await vi.importActual<
    typeof import("../../api/jambase/config")
  >("../../api/jambase/config");
  return { ...actual, isLiveEventsConfigured: () => mockIsConfigured() };
});

vi.mock("../../api/jambase/quota", () => ({
  fetchJambaseQuota: () => mockFetchQuota(),
}));

vi.mock("../../api/jambase/fetch", () => ({
  setCallRecorder: (...args: unknown[]) => mockSetCallRecorder(...args),
  setPreflightCheck: (...args: unknown[]) => mockSetPreflight(...args),
}));

vi.mock("../notifications", () => ({
  notifyQuotaWarning: (...args: unknown[]) => mockNotify(...args),
}));

vi.mock("../../db/liveQuota", () => ({
  getQuotaPeriod: async (period: string) =>
    structuredClone(periods.get(period) ?? emptyPeriod(period)),
  incrementQuotaCalls: async (period: string) => {
    const row = periods.get(period) ?? emptyPeriod(period);
    periods.set(period, { ...row, calls: row.calls + 1 });
  },
  recordWarnedThreshold: async (period: string, threshold: number) => {
    const row = periods.get(period) ?? emptyPeriod(period);
    periods.set(period, {
      ...row,
      warnedThresholds: [...row.warnedThresholds, threshold],
    });
  },
  syncQuotaPeriod: async (period: string, snapshot: QuotaSnapshot) => {
    const row = periods.get(period) ?? emptyPeriod(period);
    periods.set(period, {
      ...row,
      calls: snapshot.used,
      quota: snapshot.quota,
      periodEnd: snapshot.periodEnd,
    });
  },
  findCurrentQuotaPeriod: async (now: string) => {
    const current = [...periods.values()]
      .filter((row) => row.periodEnd !== null && row.periodEnd > now)
      .sort((a, b) =>
        (b.periodEnd as string).localeCompare(a.periodEnd as string)
      );
    return current[0] ? structuredClone(current[0]) : null;
  },
}));

const { getQuotaStatus, installQuotaTracking, resetQuotaCache } =
  await import("./quota");
const { JambaseError } = await import("../../api/jambase/config");

const PERIOD_START = "2026-11-17T13:01:29.213Z";
const PERIOD_END = "2026-12-17T13:01:29.213Z";

function configure(overrides: Record<string, unknown> = {}) {
  mockGetConfig.mockReturnValue({
    liveEvents: {
      ...DEFAULT_LIVE_EVENTS,
      enabled: true,
      apiKey: "k",
      ...overrides,
    },
  });
}

function jambaseReports(
  usedCalls: number,
  overrides: Record<string, unknown> = {}
) {
  mockFetchQuota.mockResolvedValue({
    plan: "developer",
    quota: 1000,
    usedCalls,
    overageCalls: 0,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    ...overrides,
  });
}

function hooks() {
  installQuotaTracking();
  return {
    preflight: mockSetPreflight.mock.calls[0][0] as () => Promise<void>,
    record: mockSetCallRecorder.mock.calls[0][0] as (info: {
      status: number | null;
    }) => void,
  };
}

async function recordCalls(count: number): Promise<void> {
  const { record } = hooks();
  const before = periods.get(PERIOD_START)?.calls ?? 0;
  for (let i = 0; i < count; i++) record({ status: 200 });
  await vi.waitFor(() =>
    expect(periods.get(PERIOD_START)?.calls).toBe(before + count)
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
  periods.clear();
  resetQuotaCache();
  configure();
  mockIsConfigured.mockReturnValue(true);
  jambaseReports(40);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getQuotaStatus", () => {
  it("reports JamBase's own figures for the current period", async () => {
    jambaseReports(400, { overageCalls: 0 });

    expect(await getQuotaStatus()).toEqual({
      plan: "developer",
      used: 400,
      quota: 1000,
      ratio: 0.4,
      overageCalls: 0,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      allowOverage: false,
      blocked: false,
      source: "jambase",
      checkedAt: "2026-11-20T12:00:00.000Z",
    });
  });

  it("falls back to our own count when /quota cannot be reached", async () => {
    await getQuotaStatus();
    await recordCalls(3);
    vi.setSystemTime(new Date("2026-11-20T12:06:00Z"));
    mockFetchQuota.mockRejectedValue(new JambaseError("transient", "503", 503));

    const status = await getQuotaStatus();

    expect(status).toMatchObject({ used: 43, quota: 1000, source: "local" });
  });

  it("has nothing to report before JamBase has ever answered", async () => {
    mockFetchQuota.mockRejectedValue(new JambaseError("transient", "503", 503));

    expect(await getQuotaStatus()).toMatchObject({
      plan: null,
      used: 0,
      quota: null,
      ratio: null,
      source: "unknown",
      blocked: false,
    });
  });

  it("does not call JamBase when live events are not configured", async () => {
    mockIsConfigured.mockReturnValue(false);

    await getQuotaStatus();

    expect(mockFetchQuota).not.toHaveBeenCalled();
  });

  it("treats a plan without a monthly cap as never blocked", async () => {
    jambaseReports(50_000, { quota: null });

    expect(await getQuotaStatus()).toMatchObject({
      quota: null,
      ratio: null,
      blocked: false,
    });
  });
});

describe("refreshing", () => {
  it("asks JamBase at most every five minutes", async () => {
    const { preflight } = hooks();

    await preflight();
    await preflight();
    vi.setSystemTime(new Date("2026-11-20T12:04:59Z"));
    await preflight();
    expect(mockFetchQuota).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-11-20T12:05:00Z"));
    await preflight();
    expect(mockFetchQuota).toHaveBeenCalledTimes(2);
  });

  it("shares one /quota call between concurrent checks", async () => {
    const { preflight } = hooks();

    await Promise.all([preflight(), preflight(), preflight()]);

    expect(mockFetchQuota).toHaveBeenCalledTimes(1);
  });

  it("replaces our count with JamBase's on each refresh", async () => {
    const { preflight } = hooks();
    await preflight();
    await recordCalls(5);
    expect(periods.get(PERIOD_START)?.calls).toBe(45);

    jambaseReports(60);
    vi.setSystemTime(new Date("2026-11-20T12:10:00Z"));
    await preflight();

    expect(periods.get(PERIOD_START)?.calls).toBe(60);
  });

  it("moves to the new period JamBase reports after a rollover", async () => {
    const { preflight } = hooks();
    await preflight();

    vi.setSystemTime(new Date("2026-12-17T14:00:00Z"));
    jambaseReports(2, {
      periodStart: "2026-12-17T13:01:29.213Z",
      periodEnd: "2027-01-17T13:01:29.213Z",
    });
    await preflight();

    expect((await getQuotaStatus()).periodStart).toBe(
      "2026-12-17T13:01:29.213Z"
    );
    expect((await getQuotaStatus()).used).toBe(2);
  });
});

describe("counting", () => {
  it("counts every metered call, including failures, against the current period", async () => {
    await getQuotaStatus();
    const { record } = hooks();

    record({ status: 200 });
    record({ status: 403 });
    record({ status: null });

    await vi.waitFor(() => expect(periods.get(PERIOD_START)?.calls).toBe(43));
  });

  it("counts nothing before JamBase has reported a period", async () => {
    const { record } = hooks();

    record({ status: 200 });
    await Promise.resolve();

    expect(periods.size).toBe(0);
  });
});

describe("warnings", () => {
  it("warns once at 80%, whether JamBase or our count crosses it", async () => {
    jambaseReports(799);
    await getQuotaStatus();
    expect(mockNotify).not.toHaveBeenCalled();

    await recordCalls(2);

    await vi.waitFor(() => expect(mockNotify).toHaveBeenCalledTimes(1));
    expect(mockNotify.mock.calls[0][0]).toMatchObject({
      ratio: 0.8,
      blocked: false,
    });
  });

  it("warns at 100% separately, saying calls are now refused", async () => {
    jambaseReports(1000);

    await getQuotaStatus();

    await vi.waitFor(() => expect(mockNotify).toHaveBeenCalledTimes(2));
    expect(mockNotify.mock.calls[1][0]).toMatchObject({
      ratio: 1,
      blocked: true,
    });
  });

  it("says calls carry on billed at 100% when overage is allowed", async () => {
    configure({ allowOverage: true });
    jambaseReports(1000);

    await getQuotaStatus();

    await vi.waitFor(() => expect(mockNotify).toHaveBeenCalledTimes(2));
    expect(mockNotify.mock.calls[1][0]).toMatchObject({ blocked: false });
  });

  it("does not repeat a warning within the same period", async () => {
    jambaseReports(900);
    await getQuotaStatus();
    vi.setSystemTime(new Date("2026-11-20T12:10:00Z"));
    await getQuotaStatus();

    expect(mockNotify).toHaveBeenCalledTimes(1);
  });
});

describe("guard", () => {
  it("lets calls through below the allowance", async () => {
    await expect(hooks().preflight()).resolves.toBeUndefined();
  });

  it("refuses calls once the allowance is spent", async () => {
    jambaseReports(1000);

    await expect(hooks().preflight()).rejects.toMatchObject({
      name: "JambaseError",
      kind: "quota-exceeded",
    });
  });

  it("refuses once our own count reaches the allowance between checks", async () => {
    jambaseReports(998);
    const { preflight } = hooks();
    await preflight();

    await recordCalls(2);

    await expect(preflight()).rejects.toMatchObject({
      kind: "quota-exceeded",
    });
  });

  it("keeps calling past the allowance when paid usage is allowed", async () => {
    configure({ allowOverage: true });
    jambaseReports(1500, { overageCalls: 500 });

    await expect(hooks().preflight()).resolves.toBeUndefined();
    expect(mockFetchQuota).toHaveBeenCalledTimes(1);
  });

  it("guards on the last known figures when /quota cannot be reached", async () => {
    jambaseReports(999);
    const { preflight } = hooks();
    await preflight();
    await recordCalls(1);

    vi.setSystemTime(new Date("2026-11-20T12:10:00Z"));
    mockFetchQuota.mockRejectedValue(new JambaseError("transient", "503", 503));

    await expect(preflight()).rejects.toMatchObject({
      kind: "quota-exceeded",
    });
  });

  it("lets calls through when JamBase has never answered, rather than stalling", async () => {
    mockFetchQuota.mockRejectedValue(new JambaseError("transient", "503", 503));

    await expect(hooks().preflight()).resolves.toBeUndefined();
  });
});
