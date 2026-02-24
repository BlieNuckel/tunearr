import { lidarrGet } from "../../api/lidarr/get";
import type { LidarrArtist } from "../../api/lidarr/types";

type ArtistListItem = { id: number; name: string; foreignArtistId: string };

type ArtistListResult =
  | { ok: false; error: string; status: number }
  | { ok: true; data: ArtistListItem[] };

export async function getArtistList(): Promise<ArtistListResult> {
  const result = await lidarrGet<LidarrArtist[]>("/artist");

  if (!result.ok) {
    return {
      ok: false,
      error: "Failed to fetch artists from Lidarr",
      status: result.status,
    };
  }

  return {
    ok: true,
    data: result.data.map((a) => ({
      id: a.id,
      name: a.artistName,
      foreignArtistId: a.foreignArtistId,
    })),
  };
}
