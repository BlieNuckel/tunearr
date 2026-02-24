import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LidarrHistoryRecord } from "../../api/lidarr/types";

const mockLidarrGet = vi.fn();

vi.mock("../../api/lidarr/get.js", () => ({
  lidarrGet: (...args: unknown[]) => mockLidarrGet(...args),
}));

import { buildIndexerMap, enrichRecords, getEnrichedHistory } from "./history";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRecord(
  overrides: Partial<LidarrHistoryRecord> = {}
): LidarrHistoryRecord {
  return {
    id: 1,
    albumId: 100,
    date: "2025-01-01",
    downloadId: "dl-abc",
    data: {} as Record<string, string>,
    artist: { id: 1, artistName: "Test Artist" },
    album: { id: 100, title: "Test Album" },
    ...overrides,
  };
}

function paginatedResponse(records: LidarrHistoryRecord[]) {
  return {
    page: 1,
    pageSize: 20,
    totalRecords: records.length,
    records,
  };
}

describe("buildIndexerMap", () => {
  it("builds map from grabbed records with downloadId and indexer", () => {
    const records = [
      makeRecord({ downloadId: "dl-1", data: { indexer: "Prowlarr" } }),
      makeRecord({ downloadId: "dl-2", data: { indexer: "Torznab" } }),
    ];

    const map = buildIndexerMap(records);

    expect(map.get("dl-1")).toBe("Prowlarr");
    expect(map.get("dl-2")).toBe("Torznab");
    expect(map.size).toBe(2);
  });

  it("skips records without downloadId", () => {
    const records = [
      makeRecord({ downloadId: "", data: { indexer: "Prowlarr" } }),
    ];

    const map = buildIndexerMap(records);
    expect(map.size).toBe(0);
  });

  it("skips records without indexer in data", () => {
    const records = [
      makeRecord({ downloadId: "dl-1", data: {} as Record<string, string> }),
    ];

    const map = buildIndexerMap(records);
    expect(map.size).toBe(0);
  });
});

describe("enrichRecords", () => {
  it("enriches records with sourceIndexer from indexer map", () => {
    const records = [makeRecord({ downloadId: "dl-abc" })];
    const indexerMap = new Map([["dl-abc", "Prowlarr"]]);

    const enriched = enrichRecords(records, indexerMap);

    expect(enriched[0].sourceIndexer).toBe("Prowlarr");
    expect(enriched[0]).not.toHaveProperty("downloadId");
    expect(enriched[0]).not.toHaveProperty("data");
  });

  it("sets sourceIndexer to null when no match", () => {
    const records = [makeRecord({ downloadId: "dl-no-match" })];
    const indexerMap = new Map<string, string>();

    const enriched = enrichRecords(records, indexerMap);
    expect(enriched[0].sourceIndexer).toBeNull();
  });
});

describe("getEnrichedHistory", () => {
  it("makes two Lidarr calls for imported and grabbed events", async () => {
    mockLidarrGet.mockResolvedValue({
      status: 200,
      data: paginatedResponse([]),
    });

    await getEnrichedHistory(1, 20);

    expect(mockLidarrGet).toHaveBeenCalledTimes(2);
    expect(mockLidarrGet).toHaveBeenCalledWith(
      "/history",
      expect.objectContaining({ eventType: 3 })
    );
    expect(mockLidarrGet).toHaveBeenCalledWith(
      "/history",
      expect.objectContaining({ eventType: 1 })
    );
  });

  it("correlates indexer from grabbed events via downloadId", async () => {
    const imported = makeRecord({ downloadId: "dl-abc" });
    const grabbed = makeRecord({
      id: 2,
      downloadId: "dl-abc",
      data: { indexer: "Prowlarr" },
    });

    mockLidarrGet.mockImplementation(
      (_path: string, query: Record<string, unknown>) => {
        if (query.eventType === 3) {
          return Promise.resolve({
            status: 200,
            data: paginatedResponse([imported]),
          });
        }
        return Promise.resolve({
          status: 200,
          data: paginatedResponse([grabbed]),
        });
      }
    );

    const result = await getEnrichedHistory(1, 20);

    expect(result.status).toBe(200);
    expect(result.data.records[0].sourceIndexer).toBe("Prowlarr");
  });

  it("returns sourceIndexer null when grabbed fetch fails", async () => {
    const imported = makeRecord();

    mockLidarrGet.mockImplementation(
      (_path: string, query: Record<string, unknown>) => {
        if (query.eventType === 3) {
          return Promise.resolve({
            status: 200,
            data: paginatedResponse([imported]),
          });
        }
        return Promise.reject(new Error("Lidarr down"));
      }
    );

    const result = await getEnrichedHistory(1, 20);

    expect(result.status).toBe(200);
    expect(result.data.records[0].sourceIndexer).toBeNull();
  });

  it("proxies status code from imported result", async () => {
    mockLidarrGet.mockImplementation(
      (_path: string, query: Record<string, unknown>) => {
        if (query.eventType === 3) {
          return Promise.resolve({ status: 404, data: paginatedResponse([]) });
        }
        return Promise.resolve({ status: 200, data: paginatedResponse([]) });
      }
    );

    const result = await getEnrichedHistory(1, 20);
    expect(result.status).toBe(404);
  });
});
