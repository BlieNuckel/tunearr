import { resilientFetch } from "../resilientFetch";
import { getPlexConfig } from "./config";
import { getMusicSectionKey } from "./sections";
import type { PlexArtistsResponse } from "./types";

export type ArtistPlayCount = {
  name: string;
  viewCount: number;
};

const PAGE_SIZE = 200;

const buildPageUrl = (
  baseUrl: string,
  sectionKey: string,
  start: number
): string =>
  `${baseUrl}/library/sections/${sectionKey}/all?type=8&sort=viewCount:desc` +
  `&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${PAGE_SIZE}`;

async function fetchPage(
  baseUrl: string,
  headers: Record<string, string>,
  sectionKey: string,
  start: number
): Promise<{ items: ArtistPlayCount[]; totalSize: number }> {
  const res = await resilientFetch(buildPageUrl(baseUrl, sectionKey, start), {
    headers,
  });
  if (!res.ok) throw new Error(`Plex returned ${res.status}`);

  const data: PlexArtistsResponse & { MediaContainer: { totalSize?: number } } =
    await res.json();
  const container = data.MediaContainer;
  const metadata = container?.Metadata ?? [];
  const items = metadata
    .filter((a) => (a.viewCount || 0) > 0)
    .map((a) => ({ name: a.title, viewCount: a.viewCount || 0 }));
  return { items, totalSize: container?.totalSize ?? items.length };
}

/**
 * Every artist in the library with a play count, paginated to completion. Sorted
 * by `viewCount:desc`, so once a page yields no played artist the remainder are all
 * unplayed and we can stop early. Intended for the background plays-capture job against
 * a local PMS, where there is no rate limit on walking the whole library.
 */
export async function getAllArtistPlayCounts(
  plexToken: string
): Promise<ArtistPlayCount[]> {
  const { baseUrl, headers } = getPlexConfig(plexToken);
  const sectionKey = await getMusicSectionKey(baseUrl, headers);

  const all: ArtistPlayCount[] = [];
  let start = 0;
  for (;;) {
    const { items, totalSize } = await fetchPage(
      baseUrl,
      headers,
      sectionKey,
      start
    );
    all.push(...items);
    start += PAGE_SIZE;
    if (items.length < PAGE_SIZE || start >= totalSize) break;
  }
  return all;
}
