import { lidarrGet } from "../../api/lidarr/get";
import type {
  LidarrPaginatedResponse,
  LidarrQueueItem,
} from "../../api/lidarr/types";

export async function getLidarrQueue(
  page: string | number,
  pageSize: string | number
) {
  const result = await lidarrGet<LidarrPaginatedResponse<LidarrQueueItem>>(
    "/queue",
    {
      page,
      pageSize,
      includeArtist: true,
      includeAlbum: true,
    }
  );
  return { status: result.status, data: result.data };
}
