import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, getDataSource, closeDatabase } from "./index";
import {
  appendSignalEvent,
  appendSignalEvents,
  getSignalEvents,
  getSignalIngestionUsers,
} from "./signalEvents";

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

beforeEach(async () => {
  await initializeDatabase(":memory:");
});

afterEach(async () => {
  await closeDatabase();
});

describe("appendSignalEvent / getSignalEvents", () => {
  it("appends and reads back events for a user", async () => {
    const userId = await createUser("alice");
    await appendSignalEvent(userId, "plex_track_plays", { artists: 3 });

    const events = await getSignalEvents(userId);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("plex_track_plays");
    expect(JSON.parse(events[0].payload)).toEqual({ artists: 3 });
  });

  it("filters by kind", async () => {
    const userId = await createUser("alice");
    await appendSignalEvent(userId, "plex_track_plays", {});
    await appendSignalEvent(userId, "plex_rating", { rating: 8 });
    await appendSignalEvent(userId, "plex_track_plays", {});

    expect(await getSignalEvents(userId, "plex_track_plays")).toHaveLength(2);
    expect(await getSignalEvents(userId, "plex_rating")).toHaveLength(1);
  });

  it("scopes events to the owning user", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    await appendSignalEvent(alice, "plex_track_plays", {});
    await appendSignalEvent(bob, "plex_track_plays", {});

    expect(await getSignalEvents(alice)).toHaveLength(1);
    expect(await getSignalEvents(bob)).toHaveLength(1);
  });
});

describe("appendSignalEvents", () => {
  it("keeps insertion order for rows sharing a recorded_at", async () => {
    const userId = await createUser("alice");
    await appendSignalEvents(userId, "plex_track_plays", [
      { n: 1 },
      { n: 2 },
      { n: 3 },
    ]);

    const events = await getSignalEvents(userId, "plex_track_plays");
    expect(events.map((event) => JSON.parse(event.payload).n)).toEqual([
      1, 2, 3,
    ]);
  });

  it("writes nothing for an empty batch", async () => {
    const userId = await createUser("alice");
    await appendSignalEvents(userId, "plex_track_plays", []);
    expect(await getSignalEvents(userId)).toHaveLength(0);
  });
});

describe("getSignalIngestionUsers", () => {
  it("returns only enabled users holding a Plex token", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const carol = await createUser("carol");
    await getDataSource().query(
      "UPDATE users SET plex_token = 'tok-a' WHERE id = ?",
      [alice]
    );
    await getDataSource().query(
      "UPDATE users SET plex_token = 'tok-c', enabled = 0 WHERE id = ?",
      [carol]
    );

    expect(await getSignalIngestionUsers()).toEqual([
      { userId: alice, plexToken: "tok-a" },
    ]);
    expect(bob).toBeGreaterThan(0);
  });
});
