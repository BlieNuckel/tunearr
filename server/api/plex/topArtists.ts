import { resilientFetch } from "../resilientFetch";
import { getPlexConfig } from "./config";
import type {
  PlexSectionsResponse,
  PlexArtistsResponse,
  PlexTopArtist,
} from "./types";

/** Find the first music library section key */
const getMusicSectionKey = async (
  baseUrl: string,
  headers: Record<string, string>
): Promise<string> => {
  const res = await resilientFetch(`${baseUrl}/library/sections`, { headers });
  if (!res.ok) throw new Error(`Plex returned ${res.status}`);

  const data: PlexSectionsResponse = await res.json();
  const sections = data.MediaContainer?.Directory || [];
  const musicSection = sections.find((s) => s.type === "artist");
  if (!musicSection) throw new Error("No music library found in Plex");
  return musicSection.key;
};

/** Fetch the most-played artists from the Plex music library */
export async function getTopArtists(limit: number): Promise<PlexTopArtist[]> {
  const { baseUrl, headers } = getPlexConfig();
  const sectionKey = await getMusicSectionKey(baseUrl, headers);

  const url = `${baseUrl}/library/sections/${sectionKey}/all?type=8&sort=viewCount:desc&X-Plex-Container-Start=0&X-Plex-Container-Size=${limit}`;
  const response = await resilientFetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Plex returned ${response.status}`);
  }

  const data: PlexArtistsResponse = await response.json();
  const metadata = data.MediaContainer?.Metadata || [];

  return metadata
    .filter((a) => a.viewCount > 0)
    .map((a) => ({
      name: a.title,
      viewCount: a.viewCount || 0,
      thumb: a.thumb
        ? `/api/plex/thumb?path=${encodeURIComponent(a.thumb)}`
        : "",
      genres: (a.Genre || []).map((g) => g.tag),
    }));
}
