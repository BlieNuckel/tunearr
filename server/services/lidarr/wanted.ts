import { lidarrGet } from "../../api/lidarr/get";
import type {
  LidarrPaginatedResponse,
  LidarrWantedRecord,
  LidarrHistoryRecord,
} from "../../api/lidarr/types";

type WantedEvent = {
  eventType: number;
  date: string;
};

type EnrichedWantedRecord = LidarrWantedRecord & {
  lastEvent: WantedEvent | null;
};

export function buildLastEventMap(
  historyRecords: LidarrHistoryRecord[]
): Map<number, WantedEvent> {
  const map = new Map<number, WantedEvent>();
  for (const record of historyRecords) {
    if (!map.has(record.albumId)) {
      map.set(record.albumId, {
        eventType: record.eventType,
        date: record.date,
      });
    }
  }
  return map;
}

export function enrichWantedRecords(
  records: LidarrWantedRecord[],
  lastEventMap: Map<number, WantedEvent>
): EnrichedWantedRecord[] {
  return records.map((record) => ({
    ...record,
    lastEvent: lastEventMap.get(record.id) ?? null,
  }));
}

export async function getWantedMissing(
  page: string | number,
  pageSize: string | number
) {
  const wantedResult = await lidarrGet<
    LidarrPaginatedResponse<LidarrWantedRecord>
  >("/wanted/missing", {
    page,
    pageSize,
    includeArtist: true,
    sortKey: "title",
    sortDirection: "ascending",
  });

  const historyResult = await lidarrGet<
    LidarrPaginatedResponse<LidarrHistoryRecord>
  >("/history", {
    pageSize: 200,
    sortKey: "date",
    sortDirection: "descending",
    includeAlbum: true,
  }).catch(() => null);

  const lastEventMap = buildLastEventMap(
    historyResult?.data?.records ?? []
  );
  const enrichedRecords = enrichWantedRecords(
    wantedResult.data.records,
    lastEventMap
  );

  return {
    status: wantedResult.status,
    data: {
      ...wantedResult.data,
      records: enrichedRecords,
    },
  };
}
