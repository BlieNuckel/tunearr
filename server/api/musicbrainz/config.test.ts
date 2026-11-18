import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MbServer } from "./server";

const OFFICIAL: MbServer = {
  root: "https://musicbrainz.org",
  baseUrl: "https://musicbrainz.org/ws/2",
  kind: "official",
  intervalMs: 1100,
};

const MIRROR: MbServer = {
  root: "http://mb.local",
  baseUrl: "http://mb.local/ws/2",
  kind: "custom",
  intervalMs: 0,
};

let currentServer: MbServer = OFFICIAL;

vi.mock("./server", () => ({
  getMbServer: () => currentServer,
}));

const mockAcquireMbSlot = vi.fn();
const mockResilientFetch = vi.fn();
const mockReportMbSuccess = vi.fn();
const mockReportMbRefused = vi.fn();
const mockGetMbPauseRemainingMs = vi.fn();

vi.mock("./queue", () => ({
  acquireMbSlot: (...args: unknown[]) => mockAcquireMbSlot(...args),
  reportMbSuccess: (...args: unknown[]) => mockReportMbSuccess(...args),
  reportMbRefused: (...args: unknown[]) => mockReportMbRefused(...args),
  getMbPauseRemainingMs: () => mockGetMbPauseRemainingMs(),
}));

vi.mock("../resilientFetch", () => ({
  resilientFetch: (...args: unknown[]) => mockResilientFetch(...args),
}));

import {
  classifyRefusal,
  mbFetch,
  mbJson,
  MB_HEADERS,
  MB_INTERACTIVE_DEADLINE_MS,
} from "./config";
import { MbUnavailableError } from "./errors";

const MB_BASE = "https://musicbrainz.org/ws/2";

function response(status: number, body?: unknown, retryAfter?: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "retry-after" ? (retryAfter ?? null) : null,
    },
    json: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  currentServer = OFFICIAL;
  mockAcquireMbSlot.mockResolvedValue(undefined);
  mockGetMbPauseRemainingMs.mockReturnValue(0);
  mockResilientFetch.mockResolvedValue(response(200, {}));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("classifyRefusal", () => {
  it("reads an official 503 as load shedding and a 429 as an address block", () => {
    expect(classifyRefusal(503, "official")).toBe("rate");
    expect(classifyRefusal(429, "official")).toBe("block");
  });

  it("reads a mirror's 503 as an outage and its 429 as its own rate limit", () => {
    expect(classifyRefusal(503, "custom")).toBe("outage");
    expect(classifyRefusal(429, "custom")).toBe("rate");
  });

  it("leaves everything else alone", () => {
    expect(classifyRefusal(200, "official")).toBeNull();
    expect(classifyRefusal(500, "official")).toBeNull();
    expect(classifyRefusal(404, "custom")).toBeNull();
  });
});

describe("mbFetch", () => {
  it("waits for a queue slot before fetching", async () => {
    const order: string[] = [];
    mockAcquireMbSlot.mockImplementation(() => {
      order.push("acquire");
      return Promise.resolve();
    });
    mockResilientFetch.mockImplementation(() => {
      order.push("fetch");
      return Promise.resolve(response(200, {}));
    });

    await mbFetch("/artist/abc?fmt=json");

    expect(order).toEqual(["acquire", "fetch"]);
  });

  it("gives an interactive request a deadline, queue wait included", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);

    await mbFetch("/artist/abc?fmt=json");

    expect(mockAcquireMbSlot).toHaveBeenCalledWith(
      "interactive",
      10_000 + MB_INTERACTIVE_DEADLINE_MS
    );
  });

  it("gives a background request no deadline", async () => {
    await mbFetch("/artist/abc?fmt=json", "background");
    expect(mockAcquireMbSlot).toHaveBeenCalledWith("background", undefined);
  });

  it("sends the MusicBrainz headers to the configured server", async () => {
    await mbFetch("/artist/abc?fmt=json");
    expect(mockResilientFetch).toHaveBeenCalledWith(
      `${MB_BASE}/artist/abc?fmt=json`,
      { headers: MB_HEADERS },
      expect.objectContaining({ retry: false })
    );
  });

  it("sends the request to the server it is given", async () => {
    await mbFetch("/artist/abc?fmt=json", "interactive", MIRROR);
    expect(mockResilientFetch).toHaveBeenCalledWith(
      "http://mb.local/ws/2/artist/abc?fmt=json",
      { headers: MB_HEADERS },
      expect.objectContaining({ retry: false })
    );
  });

  it("caps each attempt's timeout at the time left before the deadline", async () => {
    await mbFetch("/artist/abc");
    const options = mockResilientFetch.mock.calls[0][2] as {
      timeoutMs: number;
    };
    expect(options.timeoutMs).toBeLessThanOrEqual(MB_INTERACTIVE_DEADLINE_MS);
  });

  it("does not swallow a failed slot acquisition", async () => {
    mockAcquireMbSlot.mockRejectedValue(
      new MbUnavailableError("MusicBrainz is busy right now", 60_000)
    );
    await expect(mbFetch("/artist/abc")).rejects.toBeInstanceOf(
      MbUnavailableError
    );
    expect(mockResilientFetch).not.toHaveBeenCalled();
  });
});

describe("mbFetch refusals from the official server", () => {
  it("reports a 503 as a rate signal with its Retry-After, and retries", async () => {
    mockResilientFetch
      .mockResolvedValueOnce(response(503, undefined, "1"))
      .mockResolvedValue(response(200, {}));

    const result = await mbFetch("/artist/abc");

    expect(result.status).toBe(200);
    expect(mockReportMbRefused).toHaveBeenCalledWith("rate", 1000);
    expect(mockAcquireMbSlot).toHaveBeenCalledTimes(2);
  });

  it("reports a 503 without Retry-After so the queue rests its default", async () => {
    mockResilientFetch
      .mockResolvedValueOnce(response(503))
      .mockResolvedValue(response(200, {}));

    await mbFetch("/artist/abc");

    expect(mockReportMbRefused).toHaveBeenCalledWith("rate", undefined);
  });

  it("reports a 429 as an address block and does not retry it", async () => {
    mockResilientFetch.mockResolvedValue(response(429, undefined, "120"));

    const result = await mbFetch("/artist/abc", "background");

    expect(result.status).toBe(429);
    expect(mockReportMbRefused).toHaveBeenCalledWith("block", 30_000);
    expect(mockResilientFetch).toHaveBeenCalledTimes(1);
  });

  it("gives up and returns the last response once attempts run out", async () => {
    mockResilientFetch.mockResolvedValue(response(503));

    const result = await mbFetch("/artist/abc");

    expect(result.status).toBe(503);
    expect(mockResilientFetch).toHaveBeenCalledTimes(3);
  });
});

describe("mbFetch refusals from a mirror", () => {
  beforeEach(() => {
    currentServer = MIRROR;
  });

  it("fails a page request on a 503 without pausing the queue", async () => {
    mockResilientFetch.mockResolvedValue(response(503));

    const result = await mbFetch("/artist/abc");

    expect(result.status).toBe(503);
    expect(mockResilientFetch).toHaveBeenCalledTimes(1);
    expect(mockReportMbRefused).not.toHaveBeenCalled();
    expect(mockReportMbSuccess).not.toHaveBeenCalled();
  });

  it("lets a background request ride out an outage with a patient backoff", async () => {
    vi.useFakeTimers();
    mockResilientFetch
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(503))
      .mockResolvedValue(response(200, {}));

    const pending = mbFetch("/artist/abc", "background");
    await vi.advanceTimersByTimeAsync(1999);
    expect(mockResilientFetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(mockResilientFetch).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(4000);
    expect((await pending).status).toBe(200);
    expect(mockReportMbRefused).not.toHaveBeenCalled();
  });

  it("treats a mirror's 429 as its rate limit", async () => {
    mockResilientFetch
      .mockResolvedValueOnce(response(429, undefined, "2"))
      .mockResolvedValue(response(200, {}));

    await mbFetch("/artist/abc");

    expect(mockReportMbRefused).toHaveBeenCalledWith("rate", 2000);
  });
});

describe("mbFetch other faults", () => {
  it("does not retry a status that will not change", async () => {
    mockResilientFetch.mockResolvedValue(response(404));

    await mbFetch("/artist/abc");

    expect(mockResilientFetch).toHaveBeenCalledTimes(1);
    expect(mockReportMbSuccess).toHaveBeenCalled();
  });

  it("retries a one-off server fault without pausing the queue", async () => {
    mockResilientFetch
      .mockResolvedValueOnce(response(500))
      .mockResolvedValue(response(200, {}));

    const result = await mbFetch("/artist/abc");

    expect(result.status).toBe(200);
    expect(mockReportMbRefused).not.toHaveBeenCalled();
  });

  it("retries a request that timed out", async () => {
    mockResilientFetch
      .mockRejectedValueOnce(new DOMException("timed out", "TimeoutError"))
      .mockResolvedValue(response(200, {}));

    const result = await mbFetch("/artist/abc");

    expect(result.status).toBe(200);
    expect(mockResilientFetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry an error that will not resolve itself", async () => {
    mockResilientFetch.mockRejectedValue(new Error("bad url"));

    await expect(mbFetch("/artist/abc")).rejects.toThrow("bad url");
    expect(mockResilientFetch).toHaveBeenCalledTimes(1);
  });

  it("clears the queue's pause when MusicBrainz answers", async () => {
    await mbFetch("/artist/abc");
    expect(mockReportMbSuccess).toHaveBeenCalled();
    expect(mockReportMbRefused).not.toHaveBeenCalled();
  });
});

describe("mbJson", () => {
  it("parses a successful response", async () => {
    mockResilientFetch.mockResolvedValue(response(200, { id: "abc" }));
    expect(await mbJson("/artist/abc")).toEqual({ id: "abc" });
  });

  it("returns null when the entity does not exist", async () => {
    mockResilientFetch.mockResolvedValue(response(404));
    expect(await mbJson("/artist/missing")).toBeNull();
  });

  it("returns null for an MBID MusicBrainz rejects outright", async () => {
    mockResilientFetch.mockResolvedValue(response(400));
    expect(await mbJson("/artist/not-a-mbid")).toBeNull();
  });

  it("throws a retryable 503 when MusicBrainz refuses, so it is not cached as a miss", async () => {
    mockResilientFetch.mockResolvedValue(response(503, undefined, "1"));
    mockGetMbPauseRemainingMs.mockReturnValue(400);

    const error = await mbJson("/artist/abc").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MbUnavailableError);
    expect(error).toMatchObject({
      status: 503,
      retryable: true,
      retryAfterMs: 1000,
      message: "MusicBrainz is busy (returned 503)",
    });
  });

  it("carries the queue's pause as the retry delay for a block", async () => {
    mockResilientFetch.mockResolvedValue(response(429));
    mockGetMbPauseRemainingMs.mockReturnValue(60_000);

    await expect(mbJson("/artist/abc")).rejects.toMatchObject({
      status: 503,
      retryAfterMs: 60_000,
    });
  });

  it("turns a timeout into a retryable 503", async () => {
    mockResilientFetch.mockRejectedValue(
      new DOMException("timed out", "TimeoutError")
    );

    await expect(mbJson("/artist/abc")).rejects.toMatchObject({
      status: 503,
      retryable: true,
      message: "MusicBrainz didn't answer in time",
    });
  });

  it("keeps a non-retryable failure as it is", async () => {
    mockResilientFetch.mockResolvedValue(response(403));
    await expect(mbJson("/artist/abc")).rejects.toThrow(
      "MusicBrainz returned 403"
    );
  });

  it("queues on the lane it is given", async () => {
    await mbJson("/artist/abc", "background");
    expect(mockAcquireMbSlot).toHaveBeenCalledWith("background", undefined);
  });
});
