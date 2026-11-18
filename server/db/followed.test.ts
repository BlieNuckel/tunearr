import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, getDataSource, closeDatabase } from "./index";
import {
  dismissRelease,
  listRecentReleasesForUser,
  markReleaseViewed,
} from "./followed";

const RANGE = { from: "2026-11-04", to: "2026-11-18" };

async function createUser(username: string): Promise<number> {
  await getDataSource().query("INSERT INTO users (username) VALUES (?)", [
    username,
  ]);
  const [{ id }] = (await getDataSource().query(
    "SELECT id FROM users WHERE username = ?",
    [username]
  )) as { id: number }[];
  return id;
}

async function follow(userId: number, artistMbid: string): Promise<number> {
  await getDataSource().query(
    "INSERT INTO followed_artists (user_id, artist_mbid, artist_name) VALUES (?, ?, ?)",
    [userId, artistMbid, `Artist ${artistMbid}`]
  );
  const [{ id }] = (await getDataSource().query(
    "SELECT id FROM followed_artists WHERE user_id = ? AND artist_mbid = ?",
    [userId, artistMbid]
  )) as { id: number }[];
  return id;
}

async function release(
  followedArtistId: number,
  title: string,
  releaseDate: string | null
): Promise<number> {
  await getDataSource().query(
    `INSERT INTO followed_releases (followed_artist_id, release_key, album_title, release_date)
     VALUES (?, ?, ?, ?)`,
    [followedArtistId, title, title, releaseDate]
  );
  const [{ id }] = (await getDataSource().query(
    "SELECT id FROM followed_releases WHERE release_key = ?",
    [title]
  )) as { id: number }[];
  return id;
}

async function titles(userId: number): Promise<string[]> {
  const rows = await listRecentReleasesForUser(userId, RANGE);
  return rows.map((row) => row.album_title);
}

beforeEach(async () => {
  await initializeDatabase(":memory:");
});

afterEach(async () => {
  await closeDatabase();
});

describe("listRecentReleasesForUser", () => {
  it("returns releases dated inside the range, newest first, with their artist", async () => {
    const userId = await createUser("lasse");
    const artistId = await follow(userId, "mbid-1");
    await release(artistId, "Older", "2026-11-05");
    await release(artistId, "Newer", "2026-11-17");
    await release(artistId, "Too old", "2026-11-03");
    await release(artistId, "Upcoming", "2026-11-19");

    const rows = await listRecentReleasesForUser(userId, RANGE);

    expect(rows.map((row) => row.album_title)).toEqual(["Newer", "Older"]);
    expect(rows[0]).toMatchObject({
      artist_name: "Artist mbid-1",
      artist_mbid: "mbid-1",
    });
  });

  it("includes both ends of the range", async () => {
    const userId = await createUser("lasse");
    const artistId = await follow(userId, "mbid-1");
    await release(artistId, "First day", RANGE.from);
    await release(artistId, "Last day", RANGE.to);

    expect(await titles(userId)).toEqual(["Last day", "First day"]);
  });

  it("skips releases without a full date", async () => {
    const userId = await createUser("lasse");
    const artistId = await follow(userId, "mbid-1");
    await release(artistId, "Year only", "2026");
    await release(artistId, "Month only", "2026-11");
    await release(artistId, "Undated", null);

    expect(await titles(userId)).toEqual([]);
  });

  it("skips dismissed releases", async () => {
    const userId = await createUser("lasse");
    const artistId = await follow(userId, "mbid-1");
    const dismissed = await release(artistId, "Dismissed", "2026-11-10");
    await release(artistId, "Kept", "2026-11-11");

    await dismissRelease(userId, dismissed);

    expect(await titles(userId)).toEqual(["Kept"]);
  });

  it("only returns the user's own releases", async () => {
    const lasse = await createUser("lasse");
    const other = await createUser("other");
    await release(await follow(other, "mbid-2"), "Theirs", "2026-11-10");

    expect(await titles(lasse)).toEqual([]);
  });
});

describe("dismissRelease", () => {
  it("records when the release was dismissed", async () => {
    const userId = await createUser("lasse");
    const releaseId = await release(
      await follow(userId, "mbid-1"),
      "Album",
      "2026-11-10"
    );

    expect(await dismissRelease(userId, releaseId)).toBe(true);

    const [row] = (await getDataSource().query(
      "SELECT dismissed_at FROM followed_releases WHERE id = ?",
      [releaseId]
    )) as { dismissed_at: string | null }[];
    expect(row.dismissed_at).not.toBeNull();
  });

  it("refuses another user's release", async () => {
    const lasse = await createUser("lasse");
    const other = await createUser("other");
    const releaseId = await release(
      await follow(other, "mbid-2"),
      "Theirs",
      "2026-11-10"
    );

    expect(await dismissRelease(lasse, releaseId)).toBe(false);
    expect(await titles(other)).toEqual(["Theirs"]);
  });
});

describe("markReleaseViewed", () => {
  it("marks the user's own release and refuses anyone else's", async () => {
    const lasse = await createUser("lasse");
    const other = await createUser("other");
    const own = await release(
      await follow(lasse, "mbid-1"),
      "Own",
      "2026-11-10"
    );
    const theirs = await release(
      await follow(other, "mbid-2"),
      "Theirs",
      "2026-11-10"
    );

    expect(await markReleaseViewed(lasse, own)).toBe(true);
    expect(await markReleaseViewed(lasse, theirs)).toBe(false);

    const rows = (await getDataSource().query(
      "SELECT album_title, viewed_at FROM followed_releases ORDER BY id"
    )) as { album_title: string; viewed_at: string | null }[];
    expect(rows[0].viewed_at).not.toBeNull();
    expect(rows[1].viewed_at).toBeNull();
  });
});
