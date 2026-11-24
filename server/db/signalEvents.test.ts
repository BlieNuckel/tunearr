import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, getDataSource, closeDatabase } from "./index";
import {
  appendSignalEvents,
  getSignalEvents,
  getSignalIngestionUsers,
  getPlexLinkedUsers,
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

describe("appendSignalEvents / getSignalEvents", () => {
  it("appends and reads back events for a user", async () => {
    const userId = await createUser("alice");
    await appendSignalEvents(userId, "plex_track_plays", [{ artists: 3 }]);

    const events = await getSignalEvents(userId);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("plex_track_plays");
    expect(JSON.parse(events[0].payload)).toEqual({ artists: 3 });
  });

  it("filters by kind", async () => {
    const userId = await createUser("alice");
    await appendSignalEvents(userId, "plex_track_plays", [{}]);
    await appendSignalEvents(userId, "plex_rating", [{ rating: 8 }]);
    await appendSignalEvents(userId, "plex_track_plays", [{}]);

    expect(await getSignalEvents(userId, "plex_track_plays")).toHaveLength(2);
    expect(await getSignalEvents(userId, "plex_rating")).toHaveLength(1);
  });

  it("scopes events to the owning user", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    await appendSignalEvents(alice, "plex_track_plays", [{}]);
    await appendSignalEvents(bob, "plex_track_plays", [{}]);

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
      {
        userId: alice,
        displayName: "alice",
        plexToken: "tok-a",
        plexAccountId: null,
      },
    ]);
    expect(bob).toBeGreaterThan(0);
  });

  it("names a Plex-only user by their Plex username, then email", async () => {
    await getDataSource().query(
      `INSERT INTO users (plex_username, plex_email, plex_token)
       VALUES ('plexdan', 'dan@example.com', 'tok-d'),
              (NULL, 'eve@example.com', 'tok-e'),
              (NULL, NULL, 'tok-f')`
    );

    const names = (await getSignalIngestionUsers()).map(
      (user) => user.displayName
    );
    expect(names).toEqual(["plexdan", "eve@example.com", "unknown"]);
  });
});

describe("getPlexLinkedUsers", () => {
  it("returns enabled users linked to a plex.tv account, token or not", async () => {
    await getDataSource().query(
      `INSERT INTO users (username, plex_id, plex_token, enabled)
       VALUES ('owner', '4242', 'tok', 1),
              ('maria', '678939888', NULL, 1),
              ('gone', '555', 'tok', 0),
              ('local', NULL, 'tok', 1)`
    );

    const users = await getPlexLinkedUsers();

    expect(users.map((u) => [u.displayName, u.plexAccountId])).toEqual([
      ["owner", "4242"],
      ["maria", "678939888"],
    ]);
  });
});
