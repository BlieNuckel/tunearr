import { lidarrGet } from "../../api/lidarr/get";
import type { LidarrAlbum } from "../../api/lidarr/types";

type AlbumsResult =
  | { ok: false; error: string; status: number }
  | { ok: true; data: LidarrAlbum[] };

export async function getMonitoredAlbums(): Promise<AlbumsResult> {
  const result = await lidarrGet<LidarrAlbum[]>("/album");

  if (!result.ok) {
    return {
      ok: false,
      error: "Failed to fetch albums",
      status: result.status,
    };
  }

  return { ok: true, data: result.data.filter((album) => album.monitored) };
}
