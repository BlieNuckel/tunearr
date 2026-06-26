import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSync = vi.fn();

vi.mock("./statusSync", () => ({
  syncRequestStatuses: (...args: unknown[]) => mockSync(...args),
}));

vi.mock("../../logger", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

import {
  runStatusSyncOnce,
  startRequestStatusPoller,
  stopRequestStatusPoller,
} from "./statusPoller";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  stopRequestStatusPoller();
  vi.useRealTimers();
});

describe("runStatusSyncOnce", () => {
  it("runs the sync", async () => {
    mockSync.mockResolvedValue(undefined);
    await runStatusSyncOnce();
    expect(mockSync).toHaveBeenCalledTimes(1);
  });

  it("skips a concurrent run while one is in flight", async () => {
    let resolveSync: () => void = () => {};
    mockSync.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveSync = resolve;
        })
    );

    const first = runStatusSyncOnce();
    await runStatusSyncOnce();
    expect(mockSync).toHaveBeenCalledTimes(1);

    resolveSync();
    await first;

    mockSync.mockResolvedValue(undefined);
    await runStatusSyncOnce();
    expect(mockSync).toHaveBeenCalledTimes(2);
  });
});

describe("startRequestStatusPoller", () => {
  it("runs the sync after the first-run delay", async () => {
    mockSync.mockResolvedValue(undefined);

    startRequestStatusPoller(60_000);
    expect(mockSync).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(15_000);
    expect(mockSync).toHaveBeenCalledTimes(1);
  });

  it("reschedules on the configured interval", async () => {
    mockSync.mockResolvedValue(undefined);

    startRequestStatusPoller(60_000);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(mockSync).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(mockSync).toHaveBeenCalledTimes(2);
  });

  it("is idempotent — a second start does not double-schedule", async () => {
    mockSync.mockResolvedValue(undefined);

    startRequestStatusPoller(60_000);
    startRequestStatusPoller(60_000);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(mockSync).toHaveBeenCalledTimes(1);
  });
});
