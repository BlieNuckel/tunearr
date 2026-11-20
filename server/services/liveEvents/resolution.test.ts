import { describe, it, expect, vi, beforeEach } from "vitest";

const mockResolveArtistByMbid = vi.fn();
const mockIsConfigured = vi.fn();
const mockFindUnresolved = vi.fn();
const mockRecordResolution = vi.fn();
const mockFindLiveArtists = vi.fn();
const mockUpsert = vi.fn();

vi.mock("../../api/jambase/artists", () => ({
  resolveArtistByMbid: (...args: unknown[]) => mockResolveArtistByMbid(...args),
}));

vi.mock("../../api/jambase/config", async () => {
  const actual = await vi.importActual<
    typeof import("../../api/jambase/config")
  >("../../api/jambase/config");
  return {
    ...actual,
    isLiveEventsConfigured: () => mockIsConfigured(),
  };
});

vi.mock("../../config", () => ({
  getConfig: () => ({ liveEvents: { bannerHorizonDays: 180 } }),
}));

vi.mock("../../db/liveEvents", () => ({
  findLiveArtists: (...args: unknown[]) => mockFindLiveArtists(...args),
  upsertSweptEvents: (...args: unknown[]) => mockUpsert(...args),
  findUnresolvedFollowedArtists: (...args: unknown[]) =>
    mockFindUnresolved(...args),
  recordArtistResolution: (...args: unknown[]) => mockRecordResolution(...args),
}));

const { resolveFollowedArtists, resolveOnFollow } =
  await import("./resolution");
const { JambaseError } = await import("../../api/jambase/config");

function artist(id: number, name: string) {
  return { artist_mbid: `mbid-${id}`, artist_name: name };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsConfigured.mockReturnValue(true);
  mockFindUnresolved.mockResolvedValue([]);
  mockFindLiveArtists.mockResolvedValue([]);
  mockUpsert.mockResolvedValue({
    inserted: [],
    updated: [],
    statusChanged: [],
  });
});

describe("resolveFollowedArtists", () => {
  it("does nothing when live events are not configured", async () => {
    mockIsConfigured.mockReturnValue(false);

    const outcome = await resolveFollowedArtists(10);

    expect(outcome.attempted).toBe(0);
    expect(mockFindUnresolved).not.toHaveBeenCalled();
    expect(mockResolveArtistByMbid).not.toHaveBeenCalled();
  });

  it("stores a resolved JamBase id", async () => {
    mockFindUnresolved.mockResolvedValue([artist(1, "Yves Tumor")]);
    mockResolveArtistByMbid.mockResolvedValue({
      jambaseArtistId: "jambase:219057",
    });

    const outcome = await resolveFollowedArtists(10);

    expect(outcome).toMatchObject({ attempted: 1, resolved: 1, missing: 0 });
    expect(mockRecordResolution).toHaveBeenCalledWith(
      "mbid-1",
      "jambase:219057",
      expect.any(String)
    );
  });

  it("records a confirmed miss so the artist leaves the queue", async () => {
    mockFindUnresolved.mockResolvedValue([artist(1, "Obscure")]);
    mockResolveArtistByMbid.mockResolvedValue(null);

    const outcome = await resolveFollowedArtists(10);

    expect(outcome).toMatchObject({ resolved: 0, missing: 1 });
    expect(mockRecordResolution).toHaveBeenCalledWith(
      "mbid-1",
      null,
      expect.any(String)
    );
  });

  it("records nothing on a transient failure, so the next run retries", async () => {
    mockFindUnresolved.mockResolvedValue([artist(1, "Flaky")]);
    mockResolveArtistByMbid.mockRejectedValue(
      new JambaseError("transient", "503", 503)
    );

    const outcome = await resolveFollowedArtists(10);

    expect(outcome).toMatchObject({ attempted: 1, failed: 1 });
    expect(mockRecordResolution).not.toHaveBeenCalled();
  });

  it("keeps going after one artist fails transiently", async () => {
    mockFindUnresolved.mockResolvedValue([artist(1, "A"), artist(2, "B")]);
    mockResolveArtistByMbid
      .mockRejectedValueOnce(new JambaseError("transient", "503", 503))
      .mockResolvedValueOnce({ jambaseArtistId: "jambase:2" });

    const outcome = await resolveFollowedArtists(10);

    expect(outcome).toMatchObject({ attempted: 2, resolved: 1, failed: 1 });
  });

  it("stops the batch on a plan gate rather than spending a call per artist", async () => {
    mockFindUnresolved.mockResolvedValue([
      artist(1, "A"),
      artist(2, "B"),
      artist(3, "C"),
    ]);
    mockResolveArtistByMbid.mockRejectedValue(
      new JambaseError("plan-gated", "not on your plan", 403)
    );

    const outcome = await resolveFollowedArtists(10);

    expect(outcome.attempted).toBe(1);
    expect(mockResolveArtistByMbid).toHaveBeenCalledTimes(1);
  });

  it("stops the batch on a rejected key", async () => {
    mockFindUnresolved.mockResolvedValue([artist(1, "A"), artist(2, "B")]);
    mockResolveArtistByMbid.mockRejectedValue(
      new JambaseError("unauthorized", "bad key", 401)
    );

    await resolveFollowedArtists(10);

    expect(mockResolveArtistByMbid).toHaveBeenCalledTimes(1);
  });

  it("keeps going after a request JamBase rejected, so one odd artist cannot block the queue", async () => {
    mockFindUnresolved.mockResolvedValue([artist(1, "A"), artist(2, "B")]);
    mockResolveArtistByMbid
      .mockRejectedValueOnce(
        new JambaseError("bad-request", "lookup_error", 400)
      )
      .mockResolvedValueOnce({ jambaseArtistId: "jambase:2", name: "B" });

    const outcome = await resolveFollowedArtists(10);

    expect(mockResolveArtistByMbid).toHaveBeenCalledTimes(2);
    expect(mockRecordResolution).toHaveBeenCalledTimes(1);
    expect(outcome).toMatchObject({ attempted: 2, resolved: 1, failed: 1 });
  });

  it("passes the limit through, so a big import cannot drain the quota", async () => {
    await resolveFollowedArtists(25);
    expect(mockFindUnresolved).toHaveBeenCalledWith(25);
  });
});

function daysFromToday(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

function dated(eventKey: string, days: number) {
  return { event_key: eventKey, event_date: daysFromToday(days) };
}

describe("resolveOnFollow", () => {
  it("does nothing when live events are not configured", async () => {
    mockIsConfigured.mockReturnValue(false);

    await resolveOnFollow("mbid-1", "A");

    expect(mockFindLiveArtists).not.toHaveBeenCalled();
    expect(mockResolveArtistByMbid).not.toHaveBeenCalled();
  });

  it("spends no call when JamBase already answered for the artist", async () => {
    mockFindLiveArtists.mockResolvedValue([
      { artist_mbid: "mbid-1", jambase_artist_id: "jambase:1" },
    ]);

    await resolveOnFollow("mbid-1", "A");

    expect(mockFindLiveArtists).toHaveBeenCalledWith(["mbid-1"]);
    expect(mockResolveArtistByMbid).not.toHaveBeenCalled();
  });

  it("resolves with upcoming dates in one call and stores both", async () => {
    mockResolveArtistByMbid.mockResolvedValue({
      jambaseArtistId: "jambase:7",
      events: [dated("jambase:100", 10)],
    });

    await resolveOnFollow("mbid-1", "A");

    expect(mockResolveArtistByMbid).toHaveBeenCalledWith("mbid-1", {
      withEvents: true,
    });
    expect(mockUpsert).toHaveBeenCalledWith(
      [dated("jambase:100", 10)],
      expect.any(String)
    );
    expect(mockRecordResolution).toHaveBeenCalledWith(
      "mbid-1",
      "jambase:7",
      expect.any(String)
    );
  });

  it("keeps only dates the sweeps will refresh", async () => {
    mockResolveArtistByMbid.mockResolvedValue({
      jambaseArtistId: "jambase:7",
      events: [
        dated("past", -1),
        dated("today", 0),
        dated("edge", 180),
        dated("too-far", 181),
      ],
    });

    await resolveOnFollow("mbid-1", "A");

    const stored = mockUpsert.mock.calls[0][0] as { event_key: string }[];
    expect(stored.map((event) => event.event_key)).toEqual(["today", "edge"]);
  });

  it("records a miss so the tick does not ask again", async () => {
    mockResolveArtistByMbid.mockResolvedValue(null);

    await resolveOnFollow("mbid-1", "A");

    expect(mockRecordResolution).toHaveBeenCalledWith(
      "mbid-1",
      null,
      expect.any(String)
    );
  });

  it("stores the dates before the resolution, so a failed write leaves it pending", async () => {
    mockResolveArtistByMbid.mockResolvedValue({
      jambaseArtistId: "jambase:7",
      events: [dated("jambase:100", 10)],
    });
    mockUpsert.mockRejectedValue(new Error("disk full"));

    await resolveOnFollow("mbid-1", "A");

    expect(mockRecordResolution).not.toHaveBeenCalled();
  });

  it("swallows a JamBase failure and leaves the artist for the tick", async () => {
    mockResolveArtistByMbid.mockRejectedValue(
      new JambaseError("quota-exceeded", "spent", null)
    );

    await expect(resolveOnFollow("mbid-1", "A")).resolves.toBeUndefined();
    expect(mockRecordResolution).not.toHaveBeenCalled();
  });
});
