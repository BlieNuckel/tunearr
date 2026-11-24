import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockLogError = vi.hoisted(() => vi.fn());
const mockLogInfo = vi.hoisted(() => vi.fn());

const mockCaptureActive = vi.fn();
const mockServerAccess = vi.fn();
const mockGetActiveSessions = vi.fn();

vi.mock("../../logger", () => ({
  createLogger: () => ({
    info: mockLogInfo,
    warn: vi.fn(),
    error: mockLogError,
  }),
}));
vi.mock("../plexConnection", () => ({
  isListeningCaptureActive: () => mockCaptureActive(),
  getPlexServerAccess: () => mockServerAccess(),
}));
vi.mock("../../api/plex/sessions", () => ({
  getActiveSessions: (...args: unknown[]) => mockGetActiveSessions(...args),
}));

import {
  runListenSessionPollOnce,
  stopListenSessionPoller,
} from "./sessionPoller";
import { initializeDatabase, closeDatabase, getDataSource } from "../../db";
import { getSignalEvents } from "../../db/signalEvents";

const T0 = 1_770_000_000_000;
const OWNER_PLEX_ID = "4242";
const MARIA_PLEX_ID = "678939888";

async function createUser(
  username: string,
  plexId: string | null,
  enabled = 1
): Promise<number> {
  await getDataSource().query(
    "INSERT INTO users (username, plex_id, enabled) VALUES (?, ?, ?)",
    [username, plexId, enabled]
  );
  const [{ id }] = (await getDataSource().query(
    "SELECT id FROM users WHERE username = ?",
    [username]
  )) as { id: number }[];
  return id;
}

function session(viewOffsetMs: number, accountId = "1", ratingKey = "451") {
  return {
    sessionKey: `s-${accountId}`,
    ratingKey,
    title: "Antwerp Expo",
    artistKey: "art1",
    artistName: "Andromedik",
    albumKey: "alb1",
    albumTitle: "Live Sets",
    durationMs: 5_448_000,
    viewOffsetMs,
    machineIdentifier: `device-${accountId}`,
    product: "Plexamp",
    state: "playing",
    accountId,
  };
}

function callsWith(mock: ReturnType<typeof vi.fn>, message: string) {
  return mock.mock.calls.filter(([first]) => first === message);
}

async function storedEpisodes(userId: number) {
  const events = await getSignalEvents(userId, "plex_listen_sessions");
  return events.flatMap((event) => JSON.parse(event.payload).episodes);
}

/** Three polls: a session starts, plays a minute, then goes away. */
async function playAMinute(accountId: string) {
  mockGetActiveSessions.mockResolvedValueOnce([session(0, accountId)]);
  await runListenSessionPollOnce(T0);
  mockGetActiveSessions.mockResolvedValueOnce([session(60_000, accountId)]);
  await runListenSessionPollOnce(T0 + 60_000);
  mockGetActiveSessions.mockResolvedValueOnce([]);
  return runListenSessionPollOnce(T0 + 70_000);
}

beforeEach(async () => {
  await initializeDatabase(":memory:");
  stopListenSessionPoller();
  mockCaptureActive.mockReturnValue(true);
  mockServerAccess.mockReturnValue({
    token: "owner-token",
    ownerAccountId: OWNER_PLEX_ID,
  });
});
afterEach(async () => {
  vi.clearAllMocks();
  await closeDatabase();
});

describe("runListenSessionPollOnce", () => {
  it("reads sessions once, with the connected server's token", async () => {
    await createUser("owner", OWNER_PLEX_ID);
    await createUser("maria", MARIA_PLEX_ID);
    mockGetActiveSessions.mockResolvedValueOnce([]);

    await runListenSessionPollOnce(T0);

    expect(mockGetActiveSessions).toHaveBeenCalledTimes(1);
    expect(mockGetActiveSessions).toHaveBeenCalledWith("owner-token");
  });

  it("records the owner's listening, which the server reports as account 1", async () => {
    const owner = await createUser("owner", OWNER_PLEX_ID);

    expect(await playAMinute("1")).toBe(1);

    const [episode] = await storedEpisodes(owner);
    expect(episode).toMatchObject({
      ratingKey: "451",
      listenedMs: 60_000,
      measured: true,
    });
  });

  it("records a shared user's listening under that user, not the owner", async () => {
    const owner = await createUser("owner", OWNER_PLEX_ID);
    const maria = await createUser("maria", MARIA_PLEX_ID);

    await playAMinute(MARIA_PLEX_ID);

    expect(await storedEpisodes(maria)).toHaveLength(1);
    expect(await storedEpisodes(owner)).toHaveLength(0);
  });

  it("drops the owner account's listening when no user is linked to it", async () => {
    const daily = await createUser("daily", MARIA_PLEX_ID);

    expect(await playAMinute("1")).toBe(0);
    expect(await storedEpisodes(daily)).toHaveLength(0);
  });

  it("drops sessions of accounts no user is linked to, and of disabled users", async () => {
    await createUser("disabled", MARIA_PLEX_ID, 0);

    expect(await playAMinute(MARIA_PLEX_ID)).toBe(0);
    expect(await playAMinute("99")).toBe(0);
  });

  it("splits simultaneous sessions between their users", async () => {
    const owner = await createUser("owner", OWNER_PLEX_ID);
    const maria = await createUser("maria", MARIA_PLEX_ID);
    mockGetActiveSessions.mockResolvedValueOnce([
      session(0, "1", "356"),
      session(0, MARIA_PLEX_ID, "1268"),
    ]);
    await runListenSessionPollOnce(T0);
    mockGetActiveSessions.mockResolvedValueOnce([
      session(60_000, "1", "356"),
      session(60_000, MARIA_PLEX_ID, "1268"),
    ]);
    await runListenSessionPollOnce(T0 + 60_000);
    mockGetActiveSessions.mockResolvedValueOnce([]);

    expect(await runListenSessionPollOnce(T0 + 70_000)).toBe(2);
    expect((await storedEpisodes(owner))[0].ratingKey).toBe("356");
    expect((await storedEpisodes(maria))[0].ratingKey).toBe("1268");
  });

  it("writes nothing while a session is still running", async () => {
    const owner = await createUser("owner", OWNER_PLEX_ID);
    mockGetActiveSessions.mockResolvedValue([session(0)]);

    await runListenSessionPollOnce(T0);
    await runListenSessionPollOnce(T0 + 10_000);

    expect(await storedEpisodes(owner)).toHaveLength(0);
  });

  it("does nothing while listening capture is inactive", async () => {
    mockCaptureActive.mockReturnValue(false);
    await createUser("owner", OWNER_PLEX_ID);

    await runListenSessionPollOnce(T0);

    expect(mockGetActiveSessions).not.toHaveBeenCalled();
  });

  it("keeps a window open when the read fails rather than committing it early", async () => {
    const owner = await createUser("owner", OWNER_PLEX_ID);
    mockGetActiveSessions.mockResolvedValueOnce([session(0)]);
    await runListenSessionPollOnce(T0);
    mockGetActiveSessions.mockRejectedValueOnce(new Error("plex down"));

    await runListenSessionPollOnce(T0 + 60_000);

    expect(await storedEpisodes(owner)).toHaveLength(0);

    mockGetActiveSessions.mockResolvedValueOnce([session(120_000)]);
    await runListenSessionPollOnce(T0 + 120_000);
    mockGetActiveSessions.mockResolvedValueOnce([]);
    await runListenSessionPollOnce(T0 + 130_000);

    expect((await storedEpisodes(owner))[0].listenedMs).toBe(120_000);
  });

  it("logs a failure that persists once, and its recovery once", async () => {
    const failure = new Error("Plex returned 503");
    mockGetActiveSessions.mockRejectedValue(failure);

    await runListenSessionPollOnce(T0);
    await runListenSessionPollOnce(T0 + 5_000);
    await runListenSessionPollOnce(T0 + 10_000);

    expect(callsWith(mockLogError, "Session poll failed")).toEqual([
      ["Session poll failed", failure],
    ]);

    mockGetActiveSessions.mockResolvedValue([]);
    await runListenSessionPollOnce(T0 + 15_000);
    await runListenSessionPollOnce(T0 + 20_000);

    expect(callsWith(mockLogInfo, "Session poll recovered")).toHaveLength(1);
  });

  it("logs again when the failure changes", async () => {
    mockGetActiveSessions
      .mockRejectedValueOnce(new Error("Plex returned 503"))
      .mockRejectedValueOnce(new Error("Plex returned 401"));

    await runListenSessionPollOnce(T0);
    await runListenSessionPollOnce(T0 + 5_000);

    expect(callsWith(mockLogError, "Session poll failed")).toHaveLength(2);
  });
});
