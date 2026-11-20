import { describe, it, expect, afterEach } from "vitest";
import { createDataSource } from "./dataSource";
import { RenamePlexPlays1717000000000 } from "./migration/9_RenamePlexPlays";
import { FollowedReleases1718000000000 } from "./migration/10_FollowedReleases";
import { LiveEvents1721000000000 } from "./migration/13_LiveEvents";
import { RemoveRecommendations1725000000000 } from "./migration/17_RemoveRecommendations";
import { UserSpending1726000000000 } from "./migration/18_UserSpending";
import { FollowedReleaseDismissed1727000000000 } from "./migration/19_FollowedReleaseDismissed";
import { RequestAvailable1728000000000 } from "./migration/20_RequestAvailable";
import { LiveArtists1729000000000 } from "./migration/21_LiveArtists";
import type { DataSource } from "typeorm";

let ds: DataSource | null = null;

afterEach(async () => {
  if (ds?.isInitialized) {
    await ds.destroy();
  }
  ds = null;
});

async function initTestDb(): Promise<DataSource> {
  ds = createDataSource(":memory:");
  await ds.initialize();
  await ds.query("PRAGMA foreign_keys = ON");
  return ds;
}

describe("InitialSchema migration", () => {
  it("creates users table with correct columns", async () => {
    const db = await initTestDb();

    const columns = (await db.query("PRAGMA table_info(users)")) as {
      name: string;
    }[];
    const columnNames = columns.map((c) => c.name);

    expect(columnNames).toEqual([
      "id",
      "username",
      "password_hash",
      "plex_id",
      "plex_email",
      "plex_thumb",
      "permissions",
      "enabled",
      "created_at",
      "updated_at",
      "theme",
      "plex_username",
      "plex_token",
      "user_type",
      "live_radius_km",
      "live_lat",
      "live_lon",
      "live_regions",
      "live_announce_days",
      "live_imminent_days_local",
      "live_imminent_days_regional",
      "live_banner_enabled",
      "spending_currency",
      "spending_monthly_limit",
    ]);
  });

  it("creates sessions table with correct columns", async () => {
    const db = await initTestDb();

    const columns = (await db.query("PRAGMA table_info(sessions)")) as {
      name: string;
    }[];
    const columnNames = columns.map((c) => c.name);

    expect(columnNames).toEqual([
      "id",
      "token",
      "user_id",
      "expires_at",
      "created_at",
    ]);
  });

  it("creates expected indexes", async () => {
    const db = await initTestDb();

    const indexes = (await db.query(
      "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name"
    )) as { name: string }[];
    const indexNames = indexes.map((i) => i.name);

    expect(indexNames).toContain("idx_sessions_token");
    expect(indexNames).toContain("idx_sessions_user_id");
    expect(indexNames).toContain("idx_sessions_expires_at");
    expect(indexNames).toContain("idx_users_plex_id");
  });
});

describe("RequestLidarrStatus migration", () => {
  it("adds nullable lidarr_status column to requests", async () => {
    const db = await initTestDb();

    const columns = (await db.query("PRAGMA table_info(requests)")) as {
      name: string;
      notnull: number;
    }[];
    const lidarrStatus = columns.find((c) => c.name === "lidarr_status");

    expect(lidarrStatus).toBeDefined();
    expect(lidarrStatus?.notnull).toBe(0);
  });

  it("creates the lidarr_status index", async () => {
    const db = await initTestDb();

    const indexes = (await db.query(
      "SELECT name FROM sqlite_master WHERE type='index' AND name = 'idx_requests_lidarr_status'"
    )) as { name: string }[];

    expect(indexes.map((i) => i.name)).toContain("idx_requests_lidarr_status");
  });
});

describe("constraint enforcement", () => {
  it("enforces enabled CHECK constraint", async () => {
    const db = await initTestDb();

    await expect(
      db.query("INSERT INTO users (username, enabled) VALUES (?, ?)", [
        "test",
        2,
      ])
    ).rejects.toThrow();
  });

  it("enforces username UNIQUE constraint", async () => {
    const db = await initTestDb();

    await db.query("INSERT INTO users (username) VALUES (?)", ["alice"]);

    await expect(
      db.query("INSERT INTO users (username) VALUES (?)", ["alice"])
    ).rejects.toThrow();
  });

  it("enforces foreign key on sessions.user_id", async () => {
    const db = await initTestDb();

    await expect(
      db.query(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
        ["tok123", 999, "2099-01-01 00:00:00"]
      )
    ).rejects.toThrow();
  });

  it("cascades session deletion when user is deleted", async () => {
    const db = await initTestDb();

    await db.query("INSERT INTO users (username) VALUES (?)", ["alice"]);
    const users = await db.query("SELECT id FROM users WHERE username = ?", [
      "alice",
    ]);
    const userId = users[0].id;

    await db.query(
      "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
      ["tok123", userId, "2099-01-01 00:00:00"]
    );

    await db.query("DELETE FROM users WHERE id = ?", [userId]);

    const sessions = await db.query(
      "SELECT * FROM sessions WHERE user_id = ?",
      [userId]
    );
    expect(sessions).toHaveLength(0);
  });

  it("applies default values for permissions, enabled, and timestamps", async () => {
    const db = await initTestDb();

    await db.query("INSERT INTO users (username) VALUES (?)", ["bob"]);
    const users = await db.query("SELECT * FROM users WHERE username = ?", [
      "bob",
    ]);
    const user = users[0];

    expect(user.permissions).toBe(8);
    expect(user.enabled).toBe(1);
    expect(user.created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(user.updated_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});

describe("FollowedArtists migration", () => {
  it("creates followed_artists and followed_releases tables", async () => {
    const db = await initTestDb();

    const followedCols = (await db.query(
      "PRAGMA table_info(followed_artists)"
    )) as { name: string }[];
    expect(followedCols.map((c) => c.name)).toEqual([
      "id",
      "user_id",
      "artist_mbid",
      "artist_name",
      "last_checked_at",
      "created_at",
    ]);

    const releaseCols = (await db.query(
      "PRAGMA table_info(followed_releases)"
    )) as { name: string }[];
    expect(releaseCols.map((c) => c.name)).toEqual([
      "id",
      "followed_artist_id",
      "release_key",
      "album_title",
      "release_date",
      "notified_at",
      "release_group_mbid",
      "cover_url",
      "release_type",
      "secondary_types",
      "viewed_at",
      "dismissed_at",
    ]);
  });

  it("enforces unique (user_id, artist_mbid)", async () => {
    const db = await initTestDb();
    await db.query("INSERT INTO users (username) VALUES (?)", ["alice"]);
    const [{ id: userId }] = (await db.query(
      "SELECT id FROM users WHERE username = ?",
      ["alice"]
    )) as { id: number }[];

    await db.query(
      "INSERT INTO followed_artists (user_id, artist_mbid, artist_name) VALUES (?, ?, ?)",
      [userId, "mbid-1", "Artist"]
    );

    await expect(
      db.query(
        "INSERT INTO followed_artists (user_id, artist_mbid, artist_name) VALUES (?, ?, ?)",
        [userId, "mbid-1", "Artist"]
      )
    ).rejects.toThrow();
  });

  it("cascades followed_releases when followed_artist is deleted", async () => {
    const db = await initTestDb();
    await db.query("INSERT INTO users (username) VALUES (?)", ["bob"]);
    const [{ id: userId }] = (await db.query(
      "SELECT id FROM users WHERE username = ?",
      ["bob"]
    )) as { id: number }[];

    await db.query(
      "INSERT INTO followed_artists (user_id, artist_mbid, artist_name) VALUES (?, ?, ?)",
      [userId, "mbid-1", "Artist"]
    );
    const [{ id: followedId }] = (await db.query(
      "SELECT id FROM followed_artists WHERE artist_mbid = ?",
      ["mbid-1"]
    )) as { id: number }[];

    await db.query(
      "INSERT INTO followed_releases (followed_artist_id, release_key, album_title) VALUES (?, ?, ?)",
      [followedId, "key-1", "Album"]
    );

    await db.query("DELETE FROM followed_artists WHERE id = ?", [followedId]);

    const rows = (await db.query(
      "SELECT * FROM followed_releases WHERE followed_artist_id = ?",
      [followedId]
    )) as unknown[];
    expect(rows).toHaveLength(0);
  });

  it("FollowedReleases migration backfills MBIDs and viewed_at from legacy rows", async () => {
    const db = await initTestDb();

    const runner = db.createQueryRunner();
    const migration = new FollowedReleases1718000000000();
    await migration.down(runner);

    await db.query("INSERT INTO users (username) VALUES (?)", ["erin"]);
    const [{ id: userId }] = (await db.query(
      "SELECT id FROM users WHERE username = ?",
      ["erin"]
    )) as { id: number }[];
    await db.query(
      "UPDATE users SET followed_last_viewed_at = ? WHERE id = ?",
      ["2025-06-01T00:00:00.000Z", userId]
    );

    await db.query(
      "INSERT INTO followed_artists (user_id, artist_mbid, artist_name) VALUES (?, ?, ?)",
      [userId, "mbid-1", "Artist"]
    );
    const [{ id: followedId }] = (await db.query(
      "SELECT id FROM followed_artists WHERE artist_mbid = ?",
      ["mbid-1"]
    )) as { id: number }[];

    await db.query(
      `INSERT INTO seen_releases
         (followed_artist_id, release_key, source, album_title, external_id, notified_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        followedId,
        "old-mb|2025-04",
        "musicbrainz",
        "Old MB",
        "rg-old",
        "2025-05-01T00:00:00.000Z",
      ]
    );
    await db.query(
      `INSERT INTO seen_releases
         (followed_artist_id, release_key, source, album_title, external_id, notified_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        followedId,
        "new-dz|2025-06",
        "deezer",
        "New Deezer",
        "12345",
        "2025-07-01T00:00:00.000Z",
      ]
    );

    await migration.up(runner);
    await runner.release();

    const rows = (await db.query(
      "SELECT * FROM followed_releases ORDER BY id"
    )) as {
      album_title: string;
      release_group_mbid: string | null;
      cover_url: string | null;
      viewed_at: string | null;
    }[];

    const oldMb = rows.find((r) => r.album_title === "Old MB")!;
    expect(oldMb.release_group_mbid).toBe("rg-old");
    expect(oldMb.cover_url).toBe(
      "https://coverartarchive.org/release-group/rg-old/front-500"
    );
    expect(oldMb.viewed_at).toBe("2025-06-01T00:00:00.000Z");

    const newDz = rows.find((r) => r.album_title === "New Deezer")!;
    expect(newDz.release_group_mbid).toBeNull();
    expect(newDz.cover_url).toBeNull();
    expect(newDz.viewed_at).toBeNull();

    const userCols = (await db.query("PRAGMA table_info(users)")) as {
      name: string;
    }[];
    expect(userCols.map((c) => c.name)).not.toContain(
      "followed_last_viewed_at"
    );
  });

  it("cascades followed_artists when user is deleted", async () => {
    const db = await initTestDb();
    await db.query("INSERT INTO users (username) VALUES (?)", ["carol"]);
    const [{ id: userId }] = (await db.query(
      "SELECT id FROM users WHERE username = ?",
      ["carol"]
    )) as { id: number }[];

    await db.query(
      "INSERT INTO followed_artists (user_id, artist_mbid, artist_name) VALUES (?, ?, ?)",
      [userId, "mbid-2", "Artist 2"]
    );

    await db.query("DELETE FROM users WHERE id = ?", [userId]);

    const rows = (await db.query(
      "SELECT * FROM followed_artists WHERE user_id = ?",
      [userId]
    )) as unknown[];
    expect(rows).toHaveLength(0);
  });
});

async function insertUser(db: DataSource, username: string): Promise<number> {
  await db.query("INSERT INTO users (username) VALUES (?)", [username]);
  const [{ id }] = (await db.query("SELECT id FROM users WHERE username = ?", [
    username,
  ])) as { id: number }[];
  return id;
}

describe("signal events schema", () => {
  it("creates user_signal_events with its indexes", async () => {
    const db = await initTestDb();

    const eventCols = (await db.query(
      "PRAGMA table_info(user_signal_events)"
    )) as { name: string }[];
    expect(eventCols.map((c) => c.name)).toEqual([
      "id",
      "user_id",
      "kind",
      "payload",
      "recorded_at",
    ]);

    const indexes = (await db.query(
      "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_user_signal_events_%' ORDER BY name"
    )) as { name: string }[];
    expect(indexes.map((i) => i.name)).toEqual([
      "idx_user_signal_events_kind",
      "idx_user_signal_events_user_id",
    ]);
  });

  it("RenamePlexPlays migration relabels legacy 'snapshot' rows as 'plex_plays'", async () => {
    const db = await initTestDb();
    const userId = await insertUser(db, "dave");

    await db.query(
      "INSERT INTO user_signal_events (user_id, kind, payload) VALUES (?, ?, ?)",
      [userId, "snapshot", "{}"]
    );
    await db.query(
      "INSERT INTO user_signal_events (user_id, kind, payload) VALUES (?, ?, ?)",
      [userId, "plex_rating", "{}"]
    );

    const runner = db.createQueryRunner();
    await new RenamePlexPlays1717000000000().up(runner);
    await runner.release();

    const kinds = (
      (await db.query(
        "SELECT kind FROM user_signal_events WHERE user_id = ? ORDER BY id",
        [userId]
      )) as { kind: string }[]
    ).map((r) => r.kind);
    expect(kinds).toEqual(["plex_plays", "plex_rating"]);
  });

  it("cascades user_signal_events when user is deleted", async () => {
    const db = await initTestDb();
    const userId = await insertUser(db, "carol");

    await db.query(
      "INSERT INTO user_signal_events (user_id, kind, payload) VALUES (?, ?, ?)",
      [userId, "plex_rating", "{}"]
    );
    await db.query("DELETE FROM users WHERE id = ?", [userId]);

    const events = (await db.query(
      "SELECT * FROM user_signal_events WHERE user_id = ?",
      [userId]
    )) as unknown[];
    expect(events).toHaveLength(0);
  });

  it("enforces foreign key on user_signal_events.user_id", async () => {
    const db = await initTestDb();
    await expect(
      db.query(
        "INSERT INTO user_signal_events (user_id, kind, payload) VALUES (?, ?, ?)",
        [999, "plex_rating", "{}"]
      )
    ).rejects.toThrow();
  });
});

describe("RemoveRecommendations migration", () => {
  async function tableNames(db: DataSource): Promise<string[]> {
    const rows = (await db.query(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN
       ('user_profiles', 'promoted_album_snapshots') ORDER BY name`
    )) as { name: string }[];
    return rows.map((r) => r.name);
  }

  it("leaves no recommender tables on a fresh database", async () => {
    const db = await initTestDb();
    expect(await tableNames(db)).toEqual([]);
  });

  it("deletes plex_plays rows and keeps every other signal", async () => {
    const db = await initTestDb();
    const userId = await insertUser(db, "erin");
    const runner = db.createQueryRunner();
    await new RemoveRecommendations1725000000000().down(runner);

    for (const kind of ["plex_plays", "plex_rating", "plex_track_plays"]) {
      await db.query(
        "INSERT INTO user_signal_events (user_id, kind, payload) VALUES (?, ?, ?)",
        [userId, kind, "{}"]
      );
    }
    await new RemoveRecommendations1725000000000().up(runner);
    await runner.release();

    const kinds = (
      (await db.query("SELECT kind FROM user_signal_events ORDER BY id")) as {
        kind: string;
      }[]
    ).map((r) => r.kind);
    expect(kinds).toEqual(["plex_rating", "plex_track_plays"]);
  });

  it("reverts the schema and re-applies cleanly", async () => {
    const db = await initTestDb();
    const runner = db.createQueryRunner();

    await new RemoveRecommendations1725000000000().down(runner);
    expect(await tableNames(db)).toEqual([
      "promoted_album_snapshots",
      "user_profiles",
    ]);
    const restored = (await db.query(
      "PRAGMA table_info(live_event_performers)"
    )) as { name: string }[];
    expect(restored.map((c) => c.name)).toContain("genres");

    await new RemoveRecommendations1725000000000().up(runner);
    await runner.release();
    expect(await tableNames(db)).toEqual([]);
    const dropped = (await db.query(
      "PRAGMA table_info(live_event_performers)"
    )) as { name: string }[];
    expect(dropped.map((c) => c.name)).not.toContain("genres");
  });
});

describe("LiveQuotaUsage migration", () => {
  it("creates the usage table keyed by billing period", async () => {
    const db = await initTestDb();

    const columns = (await db.query("PRAGMA table_info(live_quota_usage)")) as {
      name: string;
    }[];
    expect(columns.map((c) => c.name)).toEqual([
      "id",
      "period",
      "calls",
      "warned_thresholds",
      "updated_at",
    ]);
  });

  it("rejects a duplicate period", async () => {
    const db = await initTestDb();
    const insert = `INSERT INTO live_quota_usage ("period", "updated_at") VALUES (?, ?)`;

    await db.query(insert, ["2026-08", "now"]);
    await expect(db.query(insert, ["2026-08", "now"])).rejects.toThrow();
  });
});

describe("LiveEvents migration", () => {
  it("creates live_events, performers, and per-user state", async () => {
    const db = await initTestDb();

    const eventCols = (await db.query("PRAGMA table_info(live_events)")) as {
      name: string;
    }[];
    expect(eventCols.map((c) => c.name)).toEqual([
      "id",
      "event_key",
      "name",
      "event_date",
      "previous_start_date",
      "event_status",
      "status_changed_at",
      "venue_name",
      "venue_city",
      "venue_country",
      "venue_lat",
      "venue_lon",
      "ticket_url",
      "image_url",
      "first_seen_at",
      "last_seen_at",
      "disappeared_at",
      "deletion_status",
      "merged_into",
    ]);

    const performerCols = (await db.query(
      "PRAGMA table_info(live_event_performers)"
    )) as { name: string }[];
    expect(performerCols.map((c) => c.name)).toEqual([
      "id",
      "event_id",
      "artist_jambase_id",
      "artist_name",
      "is_headliner",
      "performance_rank",
    ]);

    const stateCols = (await db.query(
      "PRAGMA table_info(user_live_event_state)"
    )) as { name: string }[];
    expect(stateCols.map((c) => c.name)).toEqual([
      "id",
      "user_id",
      "event_id",
      "response",
      "responded_at",
      "viewed_at",
      "notified_at",
    ]);
  });

  it("rejects a duplicate event_key", async () => {
    const db = await initTestDb();
    const insert = `INSERT INTO live_events
      (event_key, name, event_date, first_seen_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?)`;
    const args = ["jambase:1", "Show", "2026-09-01", "now", "now"];

    await db.query(insert, args);
    await expect(db.query(insert, args)).rejects.toThrow();
  });

  it("enforces foreign keys on performers and per-user state", async () => {
    const db = await initTestDb();

    await expect(
      db.query(
        "INSERT INTO live_event_performers (event_id, artist_jambase_id, artist_name) VALUES (?, ?, ?)",
        [999, "jambase:1", "Artist"]
      )
    ).rejects.toThrow();

    await expect(
      db.query(
        "INSERT INTO user_live_event_state (user_id, event_id) VALUES (?, ?)",
        [999, 999]
      )
    ).rejects.toThrow();
  });

  it("reverts cleanly, dropping the tables and added columns", async () => {
    const db = await initTestDb();

    const runner = db.createQueryRunner();
    await new LiveArtists1729000000000().down(runner);
    await new LiveEvents1721000000000().down(runner);

    const tables = (await db.query(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN
       ('live_events', 'live_event_performers', 'user_live_event_state')`
    )) as { name: string }[];
    expect(tables).toEqual([]);

    const followedCols = (await db.query(
      "PRAGMA table_info(followed_artists)"
    )) as { name: string }[];
    expect(followedCols.map((c) => c.name)).not.toContain("jambase_artist_id");

    const userCols = (await db.query("PRAGMA table_info(users)")) as {
      name: string;
    }[];
    expect(userCols.map((c) => c.name)).not.toContain("live_regions");
  });
});

describe("LiveArtists migration", () => {
  type OldFollow = [number, string, string | null, string | null];

  const AT = "2026-08-17T09:00:00.000Z";

  async function rewind(db: DataSource): Promise<void> {
    const runner = db.createQueryRunner();
    await new LiveArtists1729000000000().down(runner);
    await runner.release();
  }

  async function reapply(db: DataSource): Promise<void> {
    const runner = db.createQueryRunner();
    await new LiveArtists1729000000000().up(runner);
    await runner.release();
  }

  async function seedOldFollows(
    db: DataSource,
    rows: OldFollow[]
  ): Promise<void> {
    await insertUser(db, "a");
    await insertUser(db, "b");
    for (const [userId, mbid, jambaseId, resolvedAt] of rows) {
      await db.query(
        `INSERT INTO followed_artists
           (user_id, artist_mbid, artist_name, jambase_artist_id, jambase_resolved_at)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, mbid, mbid, jambaseId, resolvedAt]
      );
    }
  }

  async function followedColumns(db: DataSource): Promise<string[]> {
    const columns = (await db.query("PRAGMA table_info(followed_artists)")) as {
      name: string;
    }[];
    return columns.map((c) => c.name);
  }

  it("moves resolutions to one row per artist and drops the follow columns", async () => {
    const db = await initTestDb();
    await rewind(db);
    await seedOldFollows(db, [
      [1, "found", "jambase:1", AT],
      [2, "found", null, null],
      [1, "miss", null, AT],
      [1, "pending", null, null],
    ]);

    await reapply(db);

    expect(
      await db.query(
        "SELECT artist_mbid, jambase_artist_id, resolved_at FROM live_artists ORDER BY artist_mbid"
      )
    ).toEqual([
      { artist_mbid: "found", jambase_artist_id: "jambase:1", resolved_at: AT },
      { artist_mbid: "miss", jambase_artist_id: null, resolved_at: AT },
    ]);
    expect(await followedColumns(db)).not.toContain("jambase_artist_id");
    expect(await followedColumns(db)).not.toContain("jambase_resolved_at");
  });

  it("keeps an id that was stored without a timestamp", async () => {
    const db = await initTestDb();
    await rewind(db);
    await seedOldFollows(db, [[1, "odd", "jambase:3", null]]);

    await reapply(db);

    const [row] = (await db.query(
      "SELECT jambase_artist_id, resolved_at FROM live_artists"
    )) as { jambase_artist_id: string; resolved_at: string }[];
    expect(row.jambase_artist_id).toBe("jambase:3");
    expect(Number.isNaN(Date.parse(row.resolved_at))).toBe(false);
  });

  it("rejects a second row for the same artist", async () => {
    const db = await initTestDb();
    const insert =
      "INSERT INTO live_artists (artist_mbid, jambase_artist_id, resolved_at) VALUES ('a', NULL, 'now')";
    await db.query(insert);
    await expect(db.query(insert)).rejects.toThrow();
  });

  it("copies each artist's answer back onto every follow when reverted", async () => {
    const db = await initTestDb();
    await insertUser(db, "a");
    await insertUser(db, "b");
    await db.query(
      "INSERT INTO followed_artists (user_id, artist_mbid, artist_name) VALUES (1, 'found', 'x'), (2, 'found', 'x'), (1, 'new', 'y')"
    );
    await db.query(
      "INSERT INTO live_artists (artist_mbid, jambase_artist_id, resolved_at) VALUES ('found', 'jambase:1', ?)",
      [AT]
    );

    await rewind(db);

    expect(
      await db.query(
        "SELECT user_id, artist_mbid, jambase_artist_id, jambase_resolved_at FROM followed_artists ORDER BY artist_mbid, user_id"
      )
    ).toEqual([
      {
        user_id: 1,
        artist_mbid: "found",
        jambase_artist_id: "jambase:1",
        jambase_resolved_at: AT,
      },
      {
        user_id: 2,
        artist_mbid: "found",
        jambase_artist_id: "jambase:1",
        jambase_resolved_at: AT,
      },
      {
        user_id: 1,
        artist_mbid: "new",
        jambase_artist_id: null,
        jambase_resolved_at: null,
      },
    ]);
    const tables = await db.query(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'live_artists'"
    );
    expect(tables).toEqual([]);
  });
});

describe("UserSpending migration", () => {
  type SpendingRow = {
    username: string;
    spending_currency: string | null;
    spending_monthly_limit: number | null;
  };

  async function spendingRows(db: DataSource): Promise<SpendingRow[]> {
    return (await db.query(
      `SELECT username, spending_currency, spending_monthly_limit FROM users ORDER BY id`
    )) as SpendingRow[];
  }

  async function configData(db: DataSource): Promise<Record<string, unknown>> {
    const [row] = (await db.query("SELECT data FROM config WHERE id = 1")) as {
      data: string;
    }[];
    return JSON.parse(row.data);
  }

  async function rewind(db: DataSource): Promise<void> {
    const runner = db.createQueryRunner();
    await new UserSpending1726000000000().down(runner);
    await runner.release();
  }

  async function reapply(db: DataSource): Promise<void> {
    const runner = db.createQueryRunner();
    await new UserSpending1726000000000().up(runner);
    await runner.release();
  }

  async function recordPurchase(db: DataSource, userId: number): Promise<void> {
    await db.query(
      `INSERT INTO purchases (user_id, album_mbid, artist_name, album_title, price, currency)
       VALUES (?, 'rg-1', 'Artist', 'Album', 999, 'SEK')`,
      [userId]
    );
  }

  it("leaves a new user without a currency or limit", async () => {
    const db = await initTestDb();
    await insertUser(db, "erin");

    expect(await spendingRows(db)).toEqual([
      {
        username: "erin",
        spending_currency: null,
        spending_monthly_limit: null,
      },
    ]);
  });

  it("copies the instance currency and limit onto users who already have purchases", async () => {
    const db = await initTestDb();
    await rewind(db);
    const erin = await insertUser(db, "erin");
    await insertUser(db, "sam");
    await recordPurchase(db, erin);
    await db.query("INSERT INTO config (id, data) VALUES (1, ?)", [
      JSON.stringify({
        lidarrUrl: "http://lidarr:8686",
        spending: { currency: "SEK", monthlyLimit: 50000 },
      }),
    ]);

    await reapply(db);

    expect(await spendingRows(db)).toEqual([
      {
        username: "erin",
        spending_currency: "SEK",
        spending_monthly_limit: 50000,
      },
      {
        username: "sam",
        spending_currency: null,
        spending_monthly_limit: null,
      },
    ]);
    expect(await configData(db)).toEqual({ lidarrUrl: "http://lidarr:8686" });
  });

  it("falls back to USD for a purchaser when the instance never saved spending", async () => {
    const db = await initTestDb();
    await rewind(db);
    await recordPurchase(db, await insertUser(db, "erin"));
    await db.query("INSERT INTO config (id, data) VALUES (1, '{}')");

    await reapply(db);

    expect(await spendingRows(db)).toEqual([
      {
        username: "erin",
        spending_currency: "USD",
        spending_monthly_limit: null,
      },
    ]);
  });

  it("falls back to USD for a purchaser when there is no config row at all", async () => {
    const db = await initTestDb();
    await rewind(db);
    await recordPurchase(db, await insertUser(db, "erin"));

    await reapply(db);

    expect((await spendingRows(db))[0].spending_currency).toBe("USD");
  });

  it("restores the first set-up user's values as the instance setting on down", async () => {
    const db = await initTestDb();
    await db.query(
      `INSERT INTO users (username, spending_currency, spending_monthly_limit)
       VALUES ('new', NULL, NULL), ('erin', 'EUR', 3000), ('sam', 'JPY', NULL)`
    );
    await db.query("INSERT INTO config (id, data) VALUES (1, '{}')");

    await rewind(db);

    expect(await configData(db)).toEqual({
      spending: { currency: "EUR", monthlyLimit: 3000 },
    });
    const columns = (await db.query("PRAGMA table_info(users)")) as {
      name: string;
    }[];
    expect(columns.map((c) => c.name)).not.toContain("spending_currency");
    expect(columns.map((c) => c.name)).not.toContain("spending_monthly_limit");
  });

  it("leaves the instance on its defaults on down when nobody set up purchases", async () => {
    const db = await initTestDb();
    await insertUser(db, "erin");
    await db.query("INSERT INTO config (id, data) VALUES (1, '{}')");

    await rewind(db);

    expect(await configData(db)).toEqual({});
  });
});

describe("FollowedReleaseDismissed migration", () => {
  it("drops dismissed_at on down and restores it on up", async () => {
    const db = await initTestDb();
    const runner = db.createQueryRunner();

    await new FollowedReleaseDismissed1727000000000().down(runner);
    const afterDown = (await db.query(
      "PRAGMA table_info(followed_releases)"
    )) as { name: string }[];
    expect(afterDown.map((c) => c.name)).not.toContain("dismissed_at");

    await new FollowedReleaseDismissed1727000000000().up(runner);
    const afterUp = (await db.query(
      "PRAGMA table_info(followed_releases)"
    )) as { name: string }[];
    expect(afterUp.map((c) => c.name)).toContain("dismissed_at");

    await runner.release();
  });
});

async function insertImportRequest(
  db: DataSource,
  userId: number,
  mbid: string,
  lidarrStatus: string | null
): Promise<void> {
  await db.query(
    `INSERT INTO requests (user_id, album_mbid, artist_name, album_title, status, lidarr_status, updated_at)
     VALUES (?, ?, 'Artist', ?, 'approved', ?, '2026-11-15 09:30:00')`,
    [userId, mbid, mbid, lidarrStatus]
  );
}

async function availableAt(
  db: DataSource
): Promise<Record<string, string | null>> {
  const rows = (await db.query(
    "SELECT album_mbid, available_at FROM requests"
  )) as { album_mbid: string; available_at: string | null }[];
  return Object.fromEntries(rows.map((r) => [r.album_mbid, r.available_at]));
}

describe("RequestAvailable migration", () => {
  it("dates imported requests from their last update and leaves the rest", async () => {
    const db = await initTestDb();
    const runner = db.createQueryRunner();
    await new RequestAvailable1728000000000().down(runner);
    const userId = await insertUser(db, "frank");
    await insertImportRequest(db, userId, "imported", "imported");
    await insertImportRequest(db, userId, "downloading", "downloading");

    await new RequestAvailable1728000000000().up(runner);

    expect(await availableAt(db)).toEqual({
      imported: "2026-11-15T09:30:00.000Z",
      downloading: null,
    });
    await runner.release();
  });

  it("drops both columns on down", async () => {
    const db = await initTestDb();
    const runner = db.createQueryRunner();

    await new RequestAvailable1728000000000().down(runner);

    const columns = (await db.query("PRAGMA table_info(requests)")) as {
      name: string;
    }[];
    expect(columns.map((c) => c.name)).not.toContain("available_at");
    expect(columns.map((c) => c.name)).not.toContain("highlight_dismissed_at");
    await runner.release();
  });
});
