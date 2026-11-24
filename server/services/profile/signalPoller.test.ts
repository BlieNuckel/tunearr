import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockLogError = vi.hoisted(() => vi.fn());
const mockLogWarn = vi.hoisted(() => vi.fn());

const mockCaptureActive = vi.fn();
const mockGetRatedItems = vi.fn();
const mockGetAllTrackPlayCounts = vi.fn();
const mockGetAllAlbumTrackCounts = vi.fn();
const mockGetPlayHistory = vi.fn();

vi.mock("../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: mockLogWarn,
    error: mockLogError,
  }),
}));
vi.mock("../plexConnection", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../plexConnection")>()),
  isListeningCaptureActive: () => mockCaptureActive(),
  getPlexServerAccess: () => ({
    token: "server-token",
    ownerAccountId: OWNER_PLEX_ID,
  }),
}));
vi.mock("../../api/plex/ratings", () => ({
  getRatedItems: (...args: unknown[]) => mockGetRatedItems(...args),
}));
vi.mock("../../api/plex/trackPlayCounts", () => ({
  getAllTrackPlayCounts: (...args: unknown[]) =>
    mockGetAllTrackPlayCounts(...args),
}));
vi.mock("../../api/plex/albumTrackCounts", () => ({
  getAllAlbumTrackCounts: (...args: unknown[]) =>
    mockGetAllAlbumTrackCounts(...args),
}));
vi.mock("../../api/plex/playHistory", () => ({
  getPlayHistory: (...args: unknown[]) => mockGetPlayHistory(...args),
}));

const OWNER_PLEX_ID = vi.hoisted(() => "4242");

import { runSignalIngestionOnce } from "./signalPoller";
import { initializeDatabase, closeDatabase, getDataSource } from "../../db";
import { getSignalEvents } from "../../db/signalEvents";

let nextPlexId = 9000;

/** Every user is linked to a plex.tv account unless `plexId` says otherwise. */
async function createUser(
  username: string,
  plexToken: string | null,
  enabled = 1,
  plexId: string | null = String(nextPlexId++)
): Promise<void> {
  await getDataSource().query(
    "INSERT INTO users (username, plex_token, enabled, plex_id) VALUES (?, ?, ?, ?)",
    [username, plexToken, enabled, plexId]
  );
}

const ratedTrack = {
  ratingKey: "451",
  kind: "track" as const,
  title: "Air",
  artist: "Andromedik",
  rating: 10,
};

beforeEach(async () => {
  await initializeDatabase(":memory:");
  mockCaptureActive.mockReturnValue(true);
  mockGetRatedItems.mockResolvedValue([ratedTrack]);
  mockGetAllTrackPlayCounts.mockResolvedValue([
    {
      ratingKey: "451",
      title: "Air",
      artistKey: "art1",
      artistName: "Andromedik",
      albumKey: "alb1",
      albumTitle: "Prologue",
      viewCount: 120,
      durationMs: 210_000,
    },
  ]);
  mockGetPlayHistory.mockResolvedValue([
    {
      ratingKey: "451",
      title: "Air",
      artistKey: "art1",
      artistName: "Andromedik",
      albumKey: "alb1",
      albumTitle: "Prologue",
      viewedAt: 1_770_000_000,
    },
  ]);
  mockGetAllAlbumTrackCounts.mockResolvedValue([
    {
      ratingKey: "alb1",
      title: "Prologue",
      artistKey: "art1",
      artistName: "Andromedik",
      trackCount: 11,
    },
  ]);
});
afterEach(async () => {
  vi.clearAllMocks();
  await closeDatabase();
});

describe("runSignalIngestionOnce", () => {
  it("ingests ratings + a plays capture for every enabled token-holding user", async () => {
    await createUser("alice", "tok-a");
    await createUser("bob", "tok-b");

    await runSignalIngestionOnce();

    for (const userId of [1, 2]) {
      expect(await getSignalEvents(userId, "plex_rating")).toHaveLength(1);
      expect(await getSignalEvents(userId, "plex_track_plays")).toHaveLength(1);
      expect(await getSignalEvents(userId, "plex_album_tracks")).toHaveLength(
        1
      );
      expect(await getSignalEvents(userId, "plex_listen_history")).toHaveLength(
        1
      );
    }
  });

  it("skips users without a token and disabled users", async () => {
    await createUser("local", null);
    await createUser("disabled", "tok-d", 0);

    await runSignalIngestionOnce();

    expect(mockGetRatedItems).not.toHaveBeenCalled();
  });

  it("does nothing while listening capture is inactive", async () => {
    mockCaptureActive.mockReturnValue(false);
    await createUser("alice", "tok-a");

    await runSignalIngestionOnce();

    expect(mockGetRatedItems).not.toHaveBeenCalled();
    expect(await getSignalEvents(1, "plex_track_plays")).toHaveLength(0);
  });

  it("does not write a second plays capture within the interval", async () => {
    await createUser("alice", "tok-a");

    await runSignalIngestionOnce();
    await runSignalIngestionOnce();

    expect(await getSignalEvents(1, "plex_track_plays")).toHaveLength(1);
  });

  it("does not walk the catalogue again within the weekly interval", async () => {
    await createUser("alice", "tok-a");

    await runSignalIngestionOnce();
    await runSignalIngestionOnce(Date.now() + 2 * 24 * 60 * 60 * 1000);

    expect(await getSignalEvents(1, "plex_album_tracks")).toHaveLength(1);
    expect(mockGetAllAlbumTrackCounts).toHaveBeenCalledTimes(1);
  });

  it("walks the catalogue again once the interval has passed", async () => {
    await createUser("alice", "tok-a");

    await runSignalIngestionOnce();
    mockGetAllAlbumTrackCounts.mockResolvedValue([
      {
        ratingKey: "alb1",
        title: "Prologue",
        artistKey: "art1",
        artistName: "Andromedik",
        trackCount: 12,
      },
    ]);
    await runSignalIngestionOnce(Date.now() + 8 * 24 * 60 * 60 * 1000);

    expect(await getSignalEvents(1, "plex_album_tracks")).toHaveLength(2);
  });

  it("sweeps history every tick, appending only plays it has not seen", async () => {
    await createUser("alice", "tok-a");

    await runSignalIngestionOnce();
    await runSignalIngestionOnce();

    expect(mockGetPlayHistory).toHaveBeenCalledTimes(2);
    expect(await getSignalEvents(1, "plex_listen_history")).toHaveLength(1);
  });

  it("captures plays before history, so an episode finds its track length", async () => {
    await createUser("alice", "tok-a");

    await runSignalIngestionOnce();

    const events = await getSignalEvents(1, "plex_listen_history");
    const [episode] = JSON.parse(events[0].payload).episodes;
    expect(episode.durationMs).toBe(210_000);
  });

  it("isolates per-user failures so the sweep continues", async () => {
    await createUser("broken", "tok-x");
    await createUser("alice", "tok-a");
    mockGetRatedItems.mockRejectedValueOnce(new Error("plex down"));

    await runSignalIngestionOnce();

    expect(await getSignalEvents(1, "plex_track_plays")).toHaveLength(0);
    expect(await getSignalEvents(2, "plex_track_plays")).toHaveLength(1);
  });

  it("names the user whose ingestion failed", async () => {
    await createUser("broken", "tok-x");
    const failure = new Error("Plex returned 401");
    mockGetRatedItems.mockRejectedValueOnce(failure);

    await runSignalIngestionOnce();

    expect(mockLogError).toHaveBeenCalledWith(
      "Signal ingestion failed for broken (user 1)",
      failure
    );
  });

  it("reads each user's history through the server, filtered to their account", async () => {
    await createUser("owner", "tok-o", 1, OWNER_PLEX_ID);
    await createUser("maria", "tok-m", 1, "678939888");

    await runSignalIngestionOnce();

    expect(mockGetPlayHistory).toHaveBeenCalledWith("server-token", "1", 0);
    expect(mockGetPlayHistory).toHaveBeenCalledWith(
      "server-token",
      "678939888",
      0
    );
  });

  it("skips history for a user not linked to a Plex account, but not the rest", async () => {
    await createUser("local", "tok-l", 1, null);

    await runSignalIngestionOnce();

    expect(mockGetPlayHistory).not.toHaveBeenCalled();
    expect(await getSignalEvents(1, "plex_track_plays")).toHaveLength(1);
    expect(mockLogWarn).toHaveBeenCalledWith(
      "Skipping play history for local (user 1): not linked to a Plex account"
    );
  });
});
