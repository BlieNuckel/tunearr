import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetConfigValue = vi.fn();
const mockGetRatedItems = vi.fn();
const mockGetTopArtists = vi.fn();

vi.mock("../../config", () => ({
  getConfigValue: (...args: unknown[]) => mockGetConfigValue(...args),
}));
vi.mock("../../api/plex/ratings", () => ({
  getRatedItems: (...args: unknown[]) => mockGetRatedItems(...args),
}));
vi.mock("../../api/plex/topArtists", () => ({
  getTopArtists: (...args: unknown[]) => mockGetTopArtists(...args),
}));

import { runSignalIngestionOnce } from "./signalPoller";
import { initializeDatabase, closeDatabase, getDataSource } from "../../db";
import { getSignalEvents } from "../../db/userProfile";

async function createUser(
  username: string,
  plexToken: string | null,
  enabled = 1
): Promise<void> {
  await getDataSource().query(
    "INSERT INTO users (username, plex_token, enabled) VALUES (?, ?, ?)",
    [username, plexToken, enabled]
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
  mockGetConfigValue.mockReturnValue({ ratingsBackupEnabled: true });
  mockGetRatedItems.mockResolvedValue([ratedTrack]);
  mockGetTopArtists.mockResolvedValue([
    { name: "Andromedik", viewCount: 120, thumb: "", genres: [] },
  ]);
});
afterEach(async () => {
  vi.clearAllMocks();
  await closeDatabase();
});

describe("runSignalIngestionOnce", () => {
  it("ingests ratings + a snapshot for every enabled token-holding user", async () => {
    await createUser("alice", "tok-a");
    await createUser("bob", "tok-b");

    await runSignalIngestionOnce();

    for (const userId of [1, 2]) {
      expect(await getSignalEvents(userId, "plex_rating")).toHaveLength(1);
      expect(await getSignalEvents(userId, "snapshot")).toHaveLength(1);
    }
  });

  it("skips users without a token and disabled users", async () => {
    await createUser("local", null);
    await createUser("disabled", "tok-d", 0);

    await runSignalIngestionOnce();

    expect(mockGetRatedItems).not.toHaveBeenCalled();
  });

  it("does nothing when the backup is disabled", async () => {
    mockGetConfigValue.mockReturnValue({ ratingsBackupEnabled: false });
    await createUser("alice", "tok-a");

    await runSignalIngestionOnce();

    expect(mockGetRatedItems).not.toHaveBeenCalled();
    expect(await getSignalEvents(1, "snapshot")).toHaveLength(0);
  });

  it("does not write a second snapshot within the interval", async () => {
    await createUser("alice", "tok-a");

    await runSignalIngestionOnce();
    await runSignalIngestionOnce();

    expect(await getSignalEvents(1, "snapshot")).toHaveLength(1);
  });

  it("isolates per-user failures so the sweep continues", async () => {
    await createUser("broken", "tok-x");
    await createUser("alice", "tok-a");
    mockGetRatedItems.mockRejectedValueOnce(new Error("plex down"));

    await runSignalIngestionOnce();

    expect(await getSignalEvents(1, "snapshot")).toHaveLength(0);
    expect(await getSignalEvents(2, "snapshot")).toHaveLength(1);
  });
});
