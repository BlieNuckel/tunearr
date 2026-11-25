import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockLog, mockResilientFetch } = vi.hoisted(() => ({
  mockLog: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  mockResilientFetch: vi.fn(),
}));

vi.mock("../../logger", () => ({ createLogger: () => mockLog }));

vi.mock("../resilientFetch", () => ({
  resilientFetch: (...args: unknown[]) => mockResilientFetch(...args),
}));

vi.mock("./config", () => ({
  getSlskdConfig: () => ({
    baseUrl: "http://slskd:5030",
    headers: { "X-API-Key": "test-key" },
    downloadPath: "/downloads",
  }),
}));

const refused = new TypeError("fetch failed", {
  cause: Object.assign(new Error("connect ECONNREFUSED"), {
    code: "ECONNREFUSED",
  }),
});

let slskdFetch: typeof import("./request").slskdFetch;
let SlskdUnreachableError: typeof import("./errors").SlskdUnreachableError;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  ({ slskdFetch } = await import("./request"));
  ({ SlskdUnreachableError } = await import("./errors"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("slskdFetch", () => {
  it("calls the configured slskd with its API key", async () => {
    const response = { ok: true };
    mockResilientFetch.mockResolvedValue(response);

    const result = await slskdFetch("/api/v0/searches", { method: "POST" });

    expect(result).toBe(response);
    expect(mockResilientFetch).toHaveBeenCalledWith(
      "http://slskd:5030/api/v0/searches",
      { method: "POST", headers: { "X-API-Key": "test-key" } }
    );
  });

  it("returns error responses as they are, since slskd answered", async () => {
    const response = { ok: false, status: 401 };
    mockResilientFetch.mockResolvedValue(response);

    await expect(slskdFetch("/api/v0/transfers/downloads")).resolves.toBe(
      response
    );
    expect(mockLog.error).not.toHaveBeenCalled();
  });

  it("throws a readable SlskdUnreachableError when the request never lands", async () => {
    mockResilientFetch.mockRejectedValue(refused);

    const err = await slskdFetch("/api/v0/transfers/downloads").catch(
      (e: unknown) => e
    );

    expect(err).toBeInstanceOf(SlskdUnreachableError);
    expect((err as Error).message).toBe(
      "slskd unreachable at http://slskd:5030: connection refused, is slskd running?"
    );
  });

  it("logs an outage once, however many calls fail during it", async () => {
    mockResilientFetch.mockRejectedValue(refused);

    for (let i = 0; i < 3; i++) {
      await slskdFetch("/api/v0/transfers/downloads").catch(() => {});
    }

    expect(mockLog.error).toHaveBeenCalledTimes(1);
    expect(mockLog.error).toHaveBeenCalledWith(
      "slskd unreachable at http://slskd:5030: connection refused, is slskd running?"
    );
  });

  it("logs the recovery with how long slskd was down, then a new outage again", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-25T08:00:00Z"));
    mockResilientFetch.mockRejectedValueOnce(refused);
    await slskdFetch("/api/v0/transfers/downloads").catch(() => {});

    vi.setSystemTime(new Date("2026-11-25T10:15:00Z"));
    mockResilientFetch.mockResolvedValueOnce({ ok: true });
    await slskdFetch("/api/v0/transfers/downloads");

    expect(mockLog.info).toHaveBeenCalledWith(
      "slskd reachable again at http://slskd:5030 after 2 h 15 min"
    );

    mockResilientFetch.mockRejectedValueOnce(refused);
    await slskdFetch("/api/v0/transfers/downloads").catch(() => {});
    expect(mockLog.error).toHaveBeenCalledTimes(2);
  });

  it("logs nothing on success when slskd was never down", async () => {
    mockResilientFetch.mockResolvedValue({ ok: true });

    await slskdFetch("/api/v0/transfers/downloads");

    expect(mockLog.info).not.toHaveBeenCalled();
    expect(mockLog.error).not.toHaveBeenCalled();
  });
});
