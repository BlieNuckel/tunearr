import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, getDataSource, closeDatabase } from "./index";
import {
  getQuotaPeriod,
  incrementQuotaCalls,
  recordWarnedThreshold,
  listRecentPeriods,
  syncQuotaPeriod,
  findCurrentQuotaPeriod,
} from "./liveQuota";

const AT = "2026-08-17T09:00:00.000Z";

beforeEach(async () => {
  await initializeDatabase(":memory:");
});

afterEach(async () => {
  await closeDatabase();
});

describe("getQuotaPeriod", () => {
  it("reports an unused period as zero rather than missing", async () => {
    expect(await getQuotaPeriod("2026-08")).toEqual({
      period: "2026-08",
      calls: 0,
      quota: null,
      periodEnd: null,
      warnedThresholds: [],
    });
  });
});

describe("syncQuotaPeriod", () => {
  const START = "2026-11-17T13:01:29.213Z";
  const END = "2026-12-17T13:01:29.213Z";

  it("stores JamBase's figures for a new period", async () => {
    await syncQuotaPeriod(START, { used: 40, quota: 1000, periodEnd: END }, AT);

    expect(await getQuotaPeriod(START)).toEqual({
      period: START,
      calls: 40,
      quota: 1000,
      periodEnd: END,
      warnedThresholds: [],
    });
  });

  it("replaces our count with JamBase's and keeps the warnings already sent", async () => {
    await syncQuotaPeriod(START, { used: 40, quota: 1000, periodEnd: END }, AT);
    await incrementQuotaCalls(START, AT);
    await recordWarnedThreshold(START, 0.8, AT);

    await syncQuotaPeriod(
      START,
      { used: 900, quota: 1000, periodEnd: END },
      AT
    );

    expect(await getQuotaPeriod(START)).toMatchObject({
      calls: 900,
      warnedThresholds: [0.8],
    });
  });

  it("stores a plan without a monthly cap as a null quota", async () => {
    await syncQuotaPeriod(START, { used: 5, quota: null, periodEnd: END }, AT);
    expect((await getQuotaPeriod(START)).quota).toBeNull();
  });
});

describe("findCurrentQuotaPeriod", () => {
  it("returns the period that has not ended yet", async () => {
    await syncQuotaPeriod(
      "2026-10-17T13:01:29.213Z",
      { used: 900, quota: 1000, periodEnd: "2026-11-17T13:01:29.213Z" },
      AT
    );
    await syncQuotaPeriod(
      "2026-11-17T13:01:29.213Z",
      { used: 40, quota: 1000, periodEnd: "2026-12-17T13:01:29.213Z" },
      AT
    );

    const current = await findCurrentQuotaPeriod("2026-11-20T12:00:00.000Z");
    expect(current?.period).toBe("2026-11-17T13:01:29.213Z");
  });

  it("returns null once the last known period has ended", async () => {
    await syncQuotaPeriod(
      "2026-11-17T13:01:29.213Z",
      { used: 40, quota: 1000, periodEnd: "2026-12-17T13:01:29.213Z" },
      AT
    );
    expect(await findCurrentQuotaPeriod("2026-12-18T00:00:00.000Z")).toBeNull();
  });

  it("ignores rows from before periods came from JamBase", async () => {
    await incrementQuotaCalls("2026-11", AT);
    expect(await findCurrentQuotaPeriod("2026-11-20T12:00:00.000Z")).toBeNull();
  });
});

describe("incrementQuotaCalls", () => {
  it("creates the period on first use", async () => {
    await incrementQuotaCalls("2026-08", AT);
    expect((await getQuotaPeriod("2026-08")).calls).toBe(1);
  });

  it("accumulates without losing increments", async () => {
    for (let i = 0; i < 25; i += 1) {
      await incrementQuotaCalls("2026-08", AT);
    }
    expect((await getQuotaPeriod("2026-08")).calls).toBe(25);
  });

  it("survives concurrent increments, which a read-modify-write would not", async () => {
    await Promise.all(
      Array.from({ length: 20 }, () => incrementQuotaCalls("2026-08", AT))
    );
    expect((await getQuotaPeriod("2026-08")).calls).toBe(20);
  });

  it("keeps periods separate", async () => {
    await incrementQuotaCalls("2026-08", AT);
    await incrementQuotaCalls("2026-09", AT);

    expect((await getQuotaPeriod("2026-08")).calls).toBe(1);
    expect((await getQuotaPeriod("2026-09")).calls).toBe(1);
  });
});

describe("recordWarnedThreshold", () => {
  it("remembers a threshold across restarts", async () => {
    await recordWarnedThreshold("2026-08", 0.8, AT);
    expect((await getQuotaPeriod("2026-08")).warnedThresholds).toEqual([0.8]);
  });

  it("does not duplicate a threshold already recorded", async () => {
    await recordWarnedThreshold("2026-08", 0.8, AT);
    await recordWarnedThreshold("2026-08", 0.8, AT);
    expect((await getQuotaPeriod("2026-08")).warnedThresholds).toEqual([0.8]);
  });

  it("accumulates distinct thresholds", async () => {
    await recordWarnedThreshold("2026-08", 0.8, AT);
    await recordWarnedThreshold("2026-08", 1, AT);
    expect((await getQuotaPeriod("2026-08")).warnedThresholds).toEqual([
      0.8, 1,
    ]);
  });

  it("does not disturb the call count", async () => {
    await incrementQuotaCalls("2026-08", AT);
    await recordWarnedThreshold("2026-08", 0.8, AT);
    expect((await getQuotaPeriod("2026-08")).calls).toBe(1);
  });

  it("starts a new period at zero calls when warned before any call", async () => {
    await recordWarnedThreshold("2026-08", 0.8, AT);
    expect((await getQuotaPeriod("2026-08")).calls).toBe(0);
  });

  it("tolerates a corrupt thresholds blob", async () => {
    await incrementQuotaCalls("2026-08", AT);
    await getDataSource().query(
      "UPDATE live_quota_usage SET warned_thresholds = 'not json'"
    );
    expect((await getQuotaPeriod("2026-08")).warnedThresholds).toEqual([]);
  });
});

describe("listRecentPeriods", () => {
  it("returns newest first", async () => {
    await incrementQuotaCalls("2026-07", AT);
    await incrementQuotaCalls("2026-08", AT);
    await incrementQuotaCalls("2026-09", AT);

    expect((await listRecentPeriods()).map((p) => p.period)).toEqual([
      "2026-09",
      "2026-08",
      "2026-07",
    ]);
  });

  it("respects the limit", async () => {
    await incrementQuotaCalls("2026-07", AT);
    await incrementQuotaCalls("2026-08", AT);
    expect(await listRecentPeriods(1)).toHaveLength(1);
  });
});
