import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MbServer } from "./server";

const OFFICIAL: MbServer = {
  root: "https://musicbrainz.org",
  baseUrl: "https://musicbrainz.org/ws/2",
  kind: "official",
  intervalMs: 1100,
};

let currentServer: MbServer = OFFICIAL;

vi.mock("./server", () => ({
  getMbServer: () => currentServer,
}));

import {
  acquireMbSlot,
  getMbQueueDepth,
  getMbPauseRemainingMs,
  reportMbSuccess,
  reportMbRefused,
  resetMbQueue,
  type MbPriority,
} from "./queue";

const INTERVAL_MS = 1100;

function track(
  priority: MbPriority,
  label: string,
  granted: string[]
): Promise<void> {
  return acquireMbSlot(priority).then(() => {
    granted.push(label);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  currentServer = OFFICIAL;
  resetMbQueue();
});

afterEach(async () => {
  resetMbQueue();
  await vi.advanceTimersByTimeAsync(INTERVAL_MS * 2);
  vi.useRealTimers();
});

describe("acquireMbSlot", () => {
  it("grants the first slot immediately", async () => {
    const granted: string[] = [];
    void track("interactive", "first", granted);

    await vi.advanceTimersByTimeAsync(0);
    expect(granted).toEqual(["first"]);
  });

  it("spaces a concurrent burst one interval apart", async () => {
    const granted: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      void track("interactive", `r${i}`, granted);
    }

    await vi.advanceTimersByTimeAsync(0);
    expect(granted).toEqual(["r0"]);

    await vi.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(granted).toEqual(["r0", "r1"]);

    await vi.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(granted).toEqual(["r0", "r1", "r2"]);

    await vi.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(granted).toEqual(["r0", "r1", "r2", "r3"]);
  });

  it("does not release a request that arrives just after a grant", async () => {
    const granted: string[] = [];
    void track("interactive", "first", granted);
    await vi.advanceTimersByTimeAsync(0);

    void track("interactive", "second", granted);
    await vi.advanceTimersByTimeAsync(INTERVAL_MS - 1);
    expect(granted).toEqual(["first"]);

    await vi.advanceTimersByTimeAsync(1);
    expect(granted).toEqual(["first", "second"]);
  });

  it("reports the depth of each lane", async () => {
    void acquireMbSlot("interactive");
    void acquireMbSlot("interactive");
    void acquireMbSlot("background");
    await vi.advanceTimersByTimeAsync(0);

    expect(getMbQueueDepth()).toEqual({ interactive: 1, background: 1 });
  });
});

describe("lane priority", () => {
  it("lets interactive work jump ahead of queued background work", async () => {
    const granted: string[] = [];
    void track("background", "bg1", granted);
    void track("background", "bg2", granted);
    void track("interactive", "ui", granted);

    await vi.advanceTimersByTimeAsync(0);
    expect(granted).toEqual(["bg1"]);

    await vi.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(granted).toEqual(["bg1", "ui"]);

    await vi.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(granted).toEqual(["bg1", "ui", "bg2"]);
  });

  it("does not starve background work under sustained interactive load", async () => {
    const granted: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      void track("interactive", `ui${i}`, granted);
    }
    void track("background", "bg", granted);

    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 13);

    expect(granted[8]).toBe("bg");
    expect(granted).toHaveLength(13);
  });

  it("serves background work as soon as the interactive lane drains", async () => {
    const granted: string[] = [];
    void track("interactive", "ui1", granted);
    void track("background", "bg", granted);
    void track("interactive", "ui2", granted);

    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 3);
    expect(granted).toEqual(["ui1", "ui2", "bg"]);
  });
});

describe("refusals", () => {
  it("stops granting slots after a rate refusal", async () => {
    const granted: string[] = [];
    void track("interactive", "first", granted);
    await vi.advanceTimersByTimeAsync(INTERVAL_MS);

    reportMbRefused("rate", 3000);
    void track("interactive", "second", granted);

    await vi.advanceTimersByTimeAsync(2999);
    expect(granted).toEqual(["first"]);

    await vi.advanceTimersByTimeAsync(1);
    expect(granted).toEqual(["first", "second"]);
  });

  it("pauses both lanes, not just the one that was refused", async () => {
    const granted: string[] = [];
    void track("interactive", "warmup", granted);
    await vi.advanceTimersByTimeAsync(INTERVAL_MS);

    reportMbRefused("rate", 3000);
    void track("background", "bg", granted);

    await vi.advanceTimersByTimeAsync(2000);
    expect(granted).toEqual(["warmup"]);

    await vi.advanceTimersByTimeAsync(1000);
    expect(granted).toEqual(["warmup", "bg"]);
  });

  it("rests 1s after a rate refusal that names no Retry-After, without doubling", () => {
    reportMbRefused("rate");
    expect(getMbPauseRemainingMs()).toBe(1000);

    vi.advanceTimersByTime(1000);
    reportMbRefused("rate");
    expect(getMbPauseRemainingMs()).toBe(1000);
  });

  it("honors Retry-After on a rate refusal, up to a minute", () => {
    reportMbRefused("rate", 5000);
    expect(getMbPauseRemainingMs()).toBe(5000);

    reportMbRefused("rate", 10 * 60_000);
    expect(getMbPauseRemainingMs()).toBe(60_000);
  });

  it("treats an address block as minutes, doubling to 15", () => {
    reportMbRefused("block");
    expect(getMbPauseRemainingMs()).toBe(60_000);

    reportMbRefused("block");
    expect(getMbPauseRemainingMs()).toBe(120_000);

    for (let i = 0; i < 10; i += 1) reportMbRefused("block");
    expect(getMbPauseRemainingMs()).toBe(15 * 60_000);
  });

  it("waits longer than a block's backoff when Retry-After asks", () => {
    reportMbRefused("block", 5 * 60_000);
    expect(getMbPauseRemainingMs()).toBe(5 * 60_000);
  });

  it("clears the pause as soon as MusicBrainz answers again", () => {
    reportMbRefused("block");
    reportMbRefused("block");
    expect(getMbPauseRemainingMs()).toBe(120_000);

    reportMbSuccess();
    expect(getMbPauseRemainingMs()).toBe(0);

    reportMbRefused("block");
    expect(getMbPauseRemainingMs()).toBe(60_000);
  });
});

describe("deadlines", () => {
  it("rejects at once when the queue is paused past the deadline", async () => {
    reportMbRefused("block");

    await expect(
      acquireMbSlot("interactive", Date.now() + 6000)
    ).rejects.toMatchObject({
      status: 503,
      retryable: true,
      retryAfterMs: 60_000,
    });
    expect(getMbQueueDepth().interactive).toBe(0);
  });

  it("waits out a pause that ends before the deadline", async () => {
    reportMbRefused("rate", 1000);
    let granted = false;
    void acquireMbSlot("interactive", Date.now() + 6000).then(() => {
      granted = true;
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(granted).toBe(true);
  });

  it("gives up a queued slot when the deadline passes and leaves the queue", async () => {
    const granted: string[] = [];
    for (let i = 0; i < 3; i += 1) void track("interactive", `r${i}`, granted);
    await vi.advanceTimersByTimeAsync(0);

    const late = acquireMbSlot("interactive", Date.now() + 1500);
    const outcome = late.then(
      () => "granted",
      (error: { retryable?: boolean }) => (error.retryable ? "busy" : "other")
    );

    await vi.advanceTimersByTimeAsync(1500);
    expect(await outcome).toBe("busy");
    expect(getMbQueueDepth().interactive).toBe(1);

    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 3);
    expect(granted).toEqual(["r0", "r1", "r2"]);
  });

  it("does not time out a background request", async () => {
    reportMbRefused("block");
    let granted = false;
    void acquireMbSlot("background").then(() => {
      granted = true;
    });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(granted).toBe(true);
  });
});

describe("pace from the configured server", () => {
  it("spaces grants by the server's interval", async () => {
    currentServer = { ...OFFICIAL, root: "http://mb.local", intervalMs: 200 };
    const granted: string[] = [];
    for (let i = 0; i < 3; i += 1) void track("interactive", `r${i}`, granted);

    await vi.advanceTimersByTimeAsync(0);
    expect(granted).toEqual(["r0"]);

    await vi.advanceTimersByTimeAsync(200);
    expect(granted).toEqual(["r0", "r1"]);

    await vi.advanceTimersByTimeAsync(200);
    expect(granted).toEqual(["r0", "r1", "r2"]);
  });

  it("grants everything at once when the server is unpaced", async () => {
    currentServer = { ...OFFICIAL, root: "http://mb.local", intervalMs: 0 };
    const granted: string[] = [];
    for (let i = 0; i < 5; i += 1) void track("interactive", `r${i}`, granted);

    await vi.advanceTimersByTimeAsync(0);
    expect(granted).toHaveLength(5);
  });

  it("picks up a pace change without a restart", async () => {
    const granted: string[] = [];
    void track("interactive", "first", granted);
    await vi.advanceTimersByTimeAsync(INTERVAL_MS);

    currentServer = { ...OFFICIAL, intervalMs: 300 };
    void track("interactive", "a", granted);
    void track("interactive", "b", granted);
    await vi.advanceTimersByTimeAsync(0);
    expect(granted).toEqual(["first", "a"]);

    await vi.advanceTimersByTimeAsync(300);
    expect(granted).toEqual(["first", "a", "b"]);
  });

  it("drops a backoff earned against another server", async () => {
    const granted: string[] = [];
    void track("interactive", "first", granted);
    await vi.advanceTimersByTimeAsync(INTERVAL_MS);

    reportMbRefused("block");
    expect(getMbPauseRemainingMs()).toBe(60_000);

    void track("interactive", "second", granted);
    await vi.advanceTimersByTimeAsync(0);
    expect(granted).toEqual(["first"]);

    currentServer = { ...OFFICIAL, root: "http://mb.local", intervalMs: 0 };
    await vi.advanceTimersByTimeAsync(1000);

    expect(granted).toEqual(["first", "second"]);
    expect(getMbPauseRemainingMs()).toBe(0);
  });
});
