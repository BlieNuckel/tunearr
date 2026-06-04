import { resilientFetch } from "../resilientFetch";
import { getPlexConfig } from "./config";
import type {
  PlexSectionsResponse,
  PlexArtistsResponse,
  PlexHistoryResponse,
  PlexTopArtist,
  TopArtistsRange,
} from "./types";

const RANGE_DAYS: Record<Exclude<TopArtistsRange, "all">, number> = {
  "4weeks": 28,
  "6months": 183,
  "12months": 365,
};

const HISTORY_FETCH_SIZE = 5000;
const SECONDS_PER_DAY = 86400;

const buildThumbUrl = (thumb?: string): string =>
  thumb ? `/api/plex/thumb?path=${encodeURIComponent(thumb)}` : "";

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

async function getTopArtistsAllTime(
  baseUrl: string,
  headers: Record<string, string>,
  sectionKey: string,
  limit: number
): Promise<PlexTopArtist[]> {
  const url = `${baseUrl}/library/sections/${sectionKey}/all?type=8&sort=viewCount:desc&X-Plex-Container-Start=0&X-Plex-Container-Size=${limit}`;
  const response = await resilientFetch(url, { headers });
  if (!response.ok) throw new Error(`Plex returned ${response.status}`);

  const data: PlexArtistsResponse = await response.json();
  const metadata = data.MediaContainer?.Metadata || [];

  return metadata
    .filter((a) => a.viewCount > 0)
    .map((a) => ({
      name: a.title,
      viewCount: a.viewCount || 0,
      thumb: buildThumbUrl(a.thumb),
      genres: (a.Genre || []).map((g) => g.tag),
    }));
}

async function getTopArtistsByHistory(
  baseUrl: string,
  headers: Record<string, string>,
  sectionKey: string,
  limit: number,
  sinceSeconds: number
): Promise<PlexTopArtist[]> {
  const url = `${baseUrl}/status/sessions/history/all?librarySectionID=${sectionKey}&viewedAt%3E=${sinceSeconds}&sort=viewedAt:desc&X-Plex-Container-Start=0&X-Plex-Container-Size=${HISTORY_FETCH_SIZE}`;
  const response = await resilientFetch(url, { headers });
  if (!response.ok) throw new Error(`Plex returned ${response.status}`);

  const data: PlexHistoryResponse = await response.json();
  const entries = data.MediaContainer?.Metadata || [];

  const counts = new Map<string, { count: number; thumb: string }>();
  for (const entry of entries) {
    const name = entry.grandparentTitle;
    if (!name) continue;

    const existing = counts.get(name);
    if (existing) {
      existing.count += 1;
      if (!existing.thumb && entry.grandparentThumb) {
        existing.thumb = entry.grandparentThumb;
      }
    } else {
      counts.set(name, { count: 1, thumb: entry.grandparentThumb || "" });
    }
  }

  return [...counts.entries()]
    .map(([name, { count, thumb }]) => ({
      name,
      viewCount: count,
      thumb: buildThumbUrl(thumb),
      genres: [],
    }))
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, limit);
}

export async function getTopArtists(
  plexToken: string,
  limit: number,
  range: TopArtistsRange = "all"
): Promise<PlexTopArtist[]> {
  const { baseUrl, headers } = getPlexConfig(plexToken);
  const sectionKey = await getMusicSectionKey(baseUrl, headers);

  if (range === "all") {
    return getTopArtistsAllTime(baseUrl, headers, sectionKey, limit);
  }

  const sinceSeconds =
    Math.floor(Date.now() / 1000) - RANGE_DAYS[range] * SECONDS_PER_DAY;
  return getTopArtistsByHistory(
    baseUrl,
    headers,
    sectionKey,
    limit,
    sinceSeconds
  );
}
