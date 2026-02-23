import type { Request, Response } from "express";
import express from "express";
import { lidarrGet } from "../../api/lidarr/get.js";
import type {
  LidarrPaginatedResponse,
  LidarrHistoryRecord,
} from "../../api/lidarr/types";

type EnrichedHistoryRecord = Omit<LidarrHistoryRecord, "downloadId" | "data"> & {
  sourceIndexer: string | null;
};

function buildBaseQuery(req: Request): Record<string, unknown> {
  return {
    page: req.query.page || 1,
    pageSize: req.query.pageSize || 20,
    includeArtist: true,
    includeAlbum: true,
    sortKey: "date",
    sortDirection: "descending",
  };
}

function buildIndexerMap(
  grabbedRecords: LidarrHistoryRecord[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const record of grabbedRecords) {
    if (record.downloadId && record.data?.indexer) {
      map.set(record.downloadId, record.data.indexer);
    }
  }
  return map;
}

function enrichRecords(
  importedRecords: LidarrHistoryRecord[],
  indexerMap: Map<string, string>
): EnrichedHistoryRecord[] {
  return importedRecords.map(({ downloadId, data: _, ...rest }) => ({
    ...rest,
    sourceIndexer: indexerMap.get(downloadId) ?? null,
  }));
}

const router = express.Router();

router.get("/history", async (req: Request, res: Response) => {
  const baseQuery = buildBaseQuery(req);

  const [importedResult, grabbedResult] = await Promise.all([
    lidarrGet<LidarrPaginatedResponse<LidarrHistoryRecord>>("/history", {
      ...baseQuery,
      eventType: 3,
    }),
    lidarrGet<LidarrPaginatedResponse<LidarrHistoryRecord>>("/history", {
      ...baseQuery,
      eventType: 1,
    }).catch(() => null),
  ]);

  const indexerMap = buildIndexerMap(grabbedResult?.data?.records ?? []);
  const enrichedRecords = enrichRecords(
    importedResult.data.records,
    indexerMap
  );

  res.status(importedResult.status).json({
    ...importedResult.data,
    records: enrichedRecords,
  });
});

export default router;
