import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, getDataSource, closeDatabase } from "./index";
import {
  deleteUnfollowedArtistStates,
  dismissArtistState,
  listArtistStates,
  saveArtistState,
} from "./liveArtistState";

const AT = "2026-11-20T12:00:00.000Z";
const LATER = "2026-11-21T12:00:00.000Z";

const SNAPSHOT = {
  closest_event_id: 7,
  closest_distance_km: 120,
  origin_lat: 55.6,
  origin_lon: 13,
  evaluated_at: AT,
};

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

async function follow(userId: number, mbid: string): Promise<void> {
  await getDataSource().query(
    "INSERT INTO followed_artists (user_id, artist_mbid, artist_name) VALUES (?, ?, ?)",
    [userId, mbid, mbid]
  );
}

let userId: number;

beforeEach(async () => {
  await initializeDatabase(":memory:");
  userId = await createUser("lasse");
});

afterEach(async () => {
  await closeDatabase();
});

describe("saveArtistState", () => {
  it("creates one row per user and artist", async () => {
    const saved = await saveArtistState(userId, "mbid-a", SNAPSHOT);

    expect(saved).toMatchObject({
      user_id: userId,
      artist_mbid: "mbid-a",
      ...SNAPSHOT,
      notified_at: null,
      dismissed_at: null,
    });
    expect(await listArtistStates(userId)).toHaveLength(1);
  });

  it("keeps notified and dismissed times through a silent re-record", async () => {
    await saveArtistState(userId, "mbid-a", {
      ...SNAPSHOT,
      notified_at: AT,
      dismissed_at: AT,
    });

    const saved = await saveArtistState(userId, "mbid-a", {
      ...SNAPSHOT,
      closest_event_id: 8,
      evaluated_at: LATER,
    });

    expect(saved).toMatchObject({
      closest_event_id: 8,
      evaluated_at: LATER,
      notified_at: AT,
      dismissed_at: AT,
    });
  });

  it("clears a dismissal when told to", async () => {
    await saveArtistState(userId, "mbid-a", { ...SNAPSHOT, dismissed_at: AT });

    const saved = await saveArtistState(userId, "mbid-a", {
      ...SNAPSHOT,
      notified_at: LATER,
      dismissed_at: null,
    });

    expect(saved.dismissed_at).toBeNull();
  });

  it("keeps users apart", async () => {
    const other = await createUser("someone");
    await saveArtistState(userId, "mbid-a", SNAPSHOT);
    await saveArtistState(other, "mbid-a", SNAPSHOT);

    expect(await listArtistStates(userId)).toHaveLength(1);
    expect(await listArtistStates(other)).toHaveLength(1);
  });
});

describe("dismissArtistState", () => {
  it("dismisses the user's own row", async () => {
    const saved = await saveArtistState(userId, "mbid-a", SNAPSHOT);

    expect(await dismissArtistState(userId, saved.id, LATER)).toBe(true);
    expect((await listArtistStates(userId))[0].dismissed_at).toBe(LATER);
  });

  it("refuses another user's row", async () => {
    const other = await createUser("someone");
    const saved = await saveArtistState(userId, "mbid-a", SNAPSHOT);

    expect(await dismissArtistState(other, saved.id, LATER)).toBe(false);
    expect((await listArtistStates(userId))[0].dismissed_at).toBeNull();
  });
});

describe("deleteUnfollowedArtistStates", () => {
  it("drops rows whose follow is gone and keeps the rest", async () => {
    const other = await createUser("someone");
    await follow(userId, "mbid-a");
    await follow(other, "mbid-b");
    await saveArtistState(userId, "mbid-a", SNAPSHOT);
    await saveArtistState(userId, "mbid-b", SNAPSHOT);
    await saveArtistState(other, "mbid-b", SNAPSHOT);

    await deleteUnfollowedArtistStates();

    expect((await listArtistStates(userId)).map((s) => s.artist_mbid)).toEqual([
      "mbid-a",
    ]);
    expect(await listArtistStates(other)).toHaveLength(1);
  });

  it("goes when the user is deleted", async () => {
    await saveArtistState(userId, "mbid-a", SNAPSHOT);
    await getDataSource().query("PRAGMA foreign_keys = ON");
    await getDataSource().query("DELETE FROM users WHERE id = ?", [userId]);

    expect(
      await getDataSource().query("SELECT * FROM user_live_artist_state")
    ).toEqual([]);
  });
});
