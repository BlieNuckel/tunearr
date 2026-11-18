import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase, getDataSource, closeDatabase } from "./index";
import {
  dismissRequestHighlight,
  listAvailableRequestsForUser,
} from "./requests";

type RequestRow = {
  title: string;
  lidarrStatus?: string | null;
  availableAt?: string | null;
  dismissedAt?: string | null;
};

const SINCE = "2026-11-11T00:00:00.000Z";

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

async function request(userId: number, row: RequestRow): Promise<number> {
  await getDataSource().query(
    `INSERT INTO requests (user_id, album_mbid, artist_name, album_title, status, lidarr_status, available_at, highlight_dismissed_at)
     VALUES (?, ?, 'Artist', ?, 'approved', ?, ?, ?)`,
    [
      userId,
      `mbid-${row.title}`,
      row.title,
      row.lidarrStatus === undefined ? "imported" : row.lidarrStatus,
      row.availableAt === undefined
        ? "2026-11-17T10:00:00.000Z"
        : row.availableAt,
      row.dismissedAt ?? null,
    ]
  );
  const [{ id }] = (await getDataSource().query(
    "SELECT id FROM requests WHERE album_title = ?",
    [row.title]
  )) as { id: number }[];
  return id;
}

async function titles(userId: number): Promise<string[]> {
  const rows = await listAvailableRequestsForUser(userId, SINCE);
  return rows.map((row) => row.album_title);
}

beforeEach(async () => {
  await initializeDatabase(":memory:");
});

afterEach(async () => {
  await closeDatabase();
});

describe("listAvailableRequestsForUser", () => {
  it("lists the user's arrived requests, newest first", async () => {
    const userId = await createUser("ann");
    await request(userId, {
      title: "older",
      availableAt: "2026-11-12T10:00:00.000Z",
    });
    await request(userId, {
      title: "newer",
      availableAt: "2026-11-17T10:00:00.000Z",
    });

    expect(await titles(userId)).toEqual(["newer", "older"]);
  });

  it("leaves out requests that arrived before the window", async () => {
    const userId = await createUser("ann");
    await request(userId, {
      title: "old",
      availableAt: "2026-11-01T10:00:00.000Z",
    });

    expect(await titles(userId)).toEqual([]);
  });

  it("leaves out dismissed, undated and unfinished requests", async () => {
    const userId = await createUser("ann");
    await request(userId, {
      title: "dismissed",
      dismissedAt: "2026-11-17T11:00:00.000Z",
    });
    await request(userId, { title: "undated", availableAt: null });
    await request(userId, {
      title: "downloading",
      lidarrStatus: "downloading",
    });

    expect(await titles(userId)).toEqual([]);
  });

  it("only lists the user's own requests", async () => {
    const ann = await createUser("ann");
    const bob = await createUser("bob");
    await request(bob, { title: "bobs" });

    expect(await titles(ann)).toEqual([]);
  });
});

describe("dismissRequestHighlight", () => {
  it("hides the request from the user's highlights", async () => {
    const userId = await createUser("ann");
    const id = await request(userId, { title: "here" });

    expect(
      await dismissRequestHighlight(userId, id, "2026-11-18T00:00:00.000Z")
    ).toBe(true);
    expect(await titles(userId)).toEqual([]);
  });

  it("refuses another user's request", async () => {
    const ann = await createUser("ann");
    const bob = await createUser("bob");
    const id = await request(bob, { title: "bobs" });

    expect(await dismissRequestHighlight(ann, id, SINCE)).toBe(false);
  });

  it("refuses a request that has not arrived", async () => {
    const userId = await createUser("ann");
    const id = await request(userId, { title: "waiting", availableAt: null });

    expect(await dismissRequestHighlight(userId, id, SINCE)).toBe(false);
  });
});
