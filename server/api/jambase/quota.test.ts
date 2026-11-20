import { describe, it, expect, vi, beforeEach } from "vitest";

const mockJambaseGet = vi.fn();

vi.mock("./fetch", () => ({
  jambaseGet: (...args: unknown[]) => mockJambaseGet(...args),
}));

const { fetchJambaseQuota } = await import("./quota");

/** The body JamBase returned on 2026-11-20, minus the prose notes. */
const LIVE_BODY = {
  plan: "developer",
  quota: 1000,
  usedCalls: 40,
  remainingCalls: 960,
  overageCalls: 0,
  noMonthlyCap: false,
  periodStart: "2026-11-17T13:01:29.213Z",
  periodEnd: "2026-12-17T13:01:29.213Z",
  periodSource: "anchor",
  limitType: "soft",
  blocksAtQuota: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchJambaseQuota", () => {
  it("reads the live response as an unmetered call", async () => {
    mockJambaseGet.mockResolvedValue(LIVE_BODY);

    expect(await fetchJambaseQuota()).toEqual({
      plan: "developer",
      quota: 1000,
      usedCalls: 40,
      overageCalls: 0,
      periodStart: "2026-11-17T13:01:29.213Z",
      periodEnd: "2026-12-17T13:01:29.213Z",
    });
    expect(mockJambaseGet).toHaveBeenCalledWith(
      "/quota",
      {},
      { metered: false }
    );
  });

  it("reports no quota for a plan without a monthly cap", async () => {
    mockJambaseGet.mockResolvedValue({ ...LIVE_BODY, noMonthlyCap: true });
    expect((await fetchJambaseQuota()).quota).toBeNull();
  });

  it("defaults missing optional fields", async () => {
    mockJambaseGet.mockResolvedValue({
      usedCalls: 3,
      periodStart: LIVE_BODY.periodStart,
      periodEnd: LIVE_BODY.periodEnd,
    });

    expect(await fetchJambaseQuota()).toMatchObject({
      plan: null,
      quota: null,
      overageCalls: 0,
    });
  });

  it("rejects a body without usage or a period as malformed", async () => {
    for (const body of [
      { ...LIVE_BODY, usedCalls: undefined },
      { ...LIVE_BODY, periodStart: "soon" },
      { ...LIVE_BODY, periodEnd: null },
      null,
    ]) {
      mockJambaseGet.mockResolvedValue(body);
      await expect(fetchJambaseQuota()).rejects.toMatchObject({
        name: "JambaseError",
        kind: "malformed",
      });
    }
  });
});
