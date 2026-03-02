import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  LidarrHistoryRecord,
  LidarrWantedRecord,
} from "../../api/lidarr/types";

const mockLidarrGet = vi.fn();

vi.mock("../../api/lidarr/get.js", () => ({
  lidarrGet: (...args: unknown[]) => mockLidarrGet(...args),
}));

import {
  buildLastEventMap,
  enrichWantedRecords,
  getWantedMissing,
} from "./wanted";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeHistoryRecord(
  overrides: Partial<LidarrHistoryRecord> = {}
): LidarrHistoryRecord {
  return {
    id: 1,
    albumId: 100,
    eventType: 1,
    date: "2025-06-15T12:00:00Z",
    downloadId: "dl-abc",
    data: {},
    artist: { id: 1, artistName: "Test Artist" },
    album: { id: 100, title: "Test Album" },
    ...overrides,
  };
}

function makeWantedRecord(
  overrides: Partial<LidarrWantedRecord> = {}
): LidarrWantedRecord {
  return {
    id: 100,
    title: "Test Album",
    foreignAlbumId: "mbid-100",
    artist: { artistName: "Test Artist" },
    ...overrides,
  };
}

describe("buildLastEventMap", () => {
  it("builds map from history records keeping only the latest per albumId", () => {
    const records = [
      makeHistoryRecord({
        id: 1,
        albumId: 100,
        eventType: 4,
        date: "2025-06-15T12:00:00Z",
      }),
      makeHistoryRecord({
        id: 2,
        albumId: 100,
        eventType: 1,
        date: "2025-06-10T12:00:00Z",
      }),
      makeHistoryRecord({
        id: 3,
        albumId: 200,
        eventType: 7,
        date: "2025-06-14T12:00:00Z",
      }),
    ];

    const map = buildLastEventMap(records);

    expect(map.size).toBe(2);
    expect(map.get(100)).toEqual({
      eventType: 4,
      date: "2025-06-15T12:00:00Z",
    });
    expect(map.get(200)).toEqual({
      eventType: 7,
      date: "2025-06-14T12:00:00Z",
    });
  });

  it("returns empty map for empty records", () => {
    const map = buildLastEventMap([]);
    expect(map.size).toBe(0);
  });
});

describe("enrichWantedRecords", () => {
  it("attaches lastEvent from map to matching wanted records", () => {
    const wanted = [makeWantedRecord({ id: 100 })];
    const eventMap = new Map([
      [100, { eventType: 1, date: "2025-06-15T12:00:00Z" }],
    ]);

    const enriched = enrichWantedRecords(wanted, eventMap);

    expect(enriched[0].lastEvent).toEqual({
      eventType: 1,
      date: "2025-06-15T12:00:00Z",
    });
  });

  it("sets lastEvent to null when no history exists for album", () => {
    const wanted = [makeWantedRecord({ id: 999 })];
    const eventMap = new Map<number, { eventType: number; date: string }>();

    const enriched = enrichWantedRecords(wanted, eventMap);

    expect(enriched[0].lastEvent).toBeNull();
  });

  it("handles mix of matched and unmatched records", () => {
    const wanted = [
      makeWantedRecord({ id: 100 }),
      makeWantedRecord({ id: 200, title: "Other Album" }),
    ];
    const eventMap = new Map([
      [100, { eventType: 4, date: "2025-06-15T12:00:00Z" }],
    ]);

    const enriched = enrichWantedRecords(wanted, eventMap);

    expect(enriched[0].lastEvent).toEqual({
      eventType: 4,
      date: "2025-06-15T12:00:00Z",
    });
    expect(enriched[1].lastEvent).toBeNull();
  });
});

describe("getWantedMissing", () => {
  it("fetches wanted and history, enriches records", async () => {
    const wantedRecord = makeWantedRecord({ id: 100 });
    const historyRecord = makeHistoryRecord({
      albumId: 100,
      eventType: 4,
      date: "2025-06-15T12:00:00Z",
    });

    mockLidarrGet.mockImplementation((path: string) => {
      if (path === "/wanted/missing") {
        return Promise.resolve({
          status: 200,
          data: {
            page: 1,
            pageSize: 20,
            totalRecords: 1,
            records: [wantedRecord],
          },
        });
      }
      return Promise.resolve({
        status: 200,
        data: {
          page: 1,
          pageSize: 200,
          totalRecords: 1,
          records: [historyRecord],
        },
      });
    });

    const result = await getWantedMissing(1, 20);

    expect(result.status).toBe(200);
    expect(result.data.records[0].lastEvent).toEqual({
      eventType: 4,
      date: "2025-06-15T12:00:00Z",
    });
  });

  it("returns null lastEvent when history fetch fails", async () => {
    const wantedRecord = makeWantedRecord({ id: 100 });

    mockLidarrGet.mockImplementation((path: string) => {
      if (path === "/wanted/missing") {
        return Promise.resolve({
          status: 200,
          data: {
            page: 1,
            pageSize: 20,
            totalRecords: 1,
            records: [wantedRecord],
          },
        });
      }
      return Promise.reject(new Error("Lidarr down"));
    });

    const result = await getWantedMissing(1, 20);

    expect(result.status).toBe(200);
    expect(result.data.records[0].lastEvent).toBeNull();
  });

  it("proxies status code from wanted result", async () => {
    mockLidarrGet.mockImplementation((path: string) => {
      if (path === "/wanted/missing") {
        return Promise.resolve({
          status: 404,
          data: { page: 1, pageSize: 20, totalRecords: 0, records: [] },
        });
      }
      return Promise.resolve({
        status: 200,
        data: { page: 1, pageSize: 200, totalRecords: 0, records: [] },
      });
    });

    const result = await getWantedMissing(1, 20);
    expect(result.status).toBe(404);
  });

  it("calls history endpoint with correct params", async () => {
    mockLidarrGet.mockResolvedValue({
      status: 200,
      data: { page: 1, pageSize: 20, totalRecords: 0, records: [] },
    });

    await getWantedMissing(1, 20);

    expect(mockLidarrGet).toHaveBeenCalledWith("/history", {
      pageSize: 200,
      sortKey: "date",
      sortDirection: "descending",
      includeAlbum: true,
    });
  });
});
