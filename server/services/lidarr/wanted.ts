import { lidarrGet } from "../../api/lidarr/get";
import type {
  LidarrPaginatedResponse,
  LidarrWantedRecord,
} from "../../api/lidarr/types";

export async function getWantedMissing(
  page: string | number,
  pageSize: string | number
) {
  const result = await lidarrGet<LidarrPaginatedResponse<LidarrWantedRecord>>(
    "/wanted/missing",
    {
      page,
      pageSize,
      includeArtist: true,
      sortKey: "title",
      sortDirection: "ascending",
    }
  );
  return { status: result.status, data: result.data };
}
