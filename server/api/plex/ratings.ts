import { resilientFetch } from "../resilientFetch";
import { getPlexConfig } from "./config";
import { getMusicSectionKey } from "./sections";
import type {
  PlexRatedItem,
  PlexRatedItemMetadata,
  PlexRatedItemsResponse,
  PlexRatingType,
} from "./types";

const PAGE_SIZE = 100;

const DEFAULT_RATING_TYPES: PlexRatingType[] = [9, 10];

const KIND_BY_TYPE: Record<PlexRatingType, PlexRatedItem["kind"]> = {
  9: "album",
  10: "track",
};

const buildPageUrl = (
  baseUrl: string,
  sectionKey: string,
  type: PlexRatingType,
  start: number
): string =>
  `${baseUrl}/library/sections/${sectionKey}/all?type=${type}` +
  `&userRating%3E=1&sort=userRating:desc` +
  `&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${PAGE_SIZE}`;

const mapRatedItem = (
  raw: PlexRatedItemMetadata,
  type: PlexRatingType
): PlexRatedItem => {
  const kind = KIND_BY_TYPE[type];
  const artist = kind === "track" ? raw.grandparentTitle : raw.parentTitle;
  return {
    ratingKey: raw.ratingKey,
    kind,
    title: raw.title,
    artist: artist ?? "",
    rating: raw.userRating ?? 0,
  };
};

async function fetchRatedPage(
  baseUrl: string,
  headers: Record<string, string>,
  sectionKey: string,
  type: PlexRatingType,
  start: number
): Promise<{ items: PlexRatedItem[]; totalSize: number }> {
  const url = buildPageUrl(baseUrl, sectionKey, type, start);
  const res = await resilientFetch(url, { headers });
  if (!res.ok) throw new Error(`Plex returned ${res.status}`);

  const data: PlexRatedItemsResponse = await res.json();
  const container = data.MediaContainer;
  const metadata = container?.Metadata ?? [];
  const items = metadata
    .filter((m) => typeof m.userRating === "number")
    .map((m) => mapRatedItem(m, type));
  return { items, totalSize: container?.totalSize ?? items.length };
}

async function fetchRatedByType(
  baseUrl: string,
  headers: Record<string, string>,
  sectionKey: string,
  type: PlexRatingType
): Promise<PlexRatedItem[]> {
  const all: PlexRatedItem[] = [];
  let start = 0;
  for (;;) {
    const { items, totalSize } = await fetchRatedPage(
      baseUrl,
      headers,
      sectionKey,
      type,
      start
    );
    all.push(...items);
    start += PAGE_SIZE;
    if (items.length === 0 || start >= totalSize) break;
  }
  return all;
}

/**
 * Read the current user's rated music via the per-user token path.
 * Uses a server-side `userRating>=1` filter so only the (small) rated set is
 * fetched — the full library is never scanned. Missing `userRating` is treated
 * as unrated and excluded by the filter; an item read with `userRating` absent
 * is also dropped client-side rather than coerced to 0.
 */
export async function getRatedItems(
  plexToken: string,
  types: PlexRatingType[] = DEFAULT_RATING_TYPES
): Promise<PlexRatedItem[]> {
  const { baseUrl, headers } = getPlexConfig(plexToken);
  const sectionKey = await getMusicSectionKey(baseUrl, headers);

  const perType = await Promise.all(
    types.map((type) => fetchRatedByType(baseUrl, headers, sectionKey, type))
  );
  return perType.flat();
}
