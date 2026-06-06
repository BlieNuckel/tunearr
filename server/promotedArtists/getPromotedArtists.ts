import { getTopArtists } from "../api/plex/topArtists";
import { getSimilarArtists } from "../api/lastfm/artists";
import { enrichArtistsWithImages } from "../services/lastfm";
import { lidarrGet } from "../api/lidarr/get";
import type { LidarrArtist } from "../api/lidarr/types";
import { getConfigValue } from "../config";
import { weightedRandomPick, shuffle } from "../utils/random";
import type { PromotedArtist, PromotedArtistsResult } from "./types";

export type { PromotedArtistsResult } from "./types";

type SimilarArtist = {
  name: string;
  mbid: string;
  match: number;
  imageUrl: string;
};

type CacheEntry = { result: PromotedArtistsResult; cachedAt: number };

type LibraryLookup = (name: string, mbid: string) => boolean;

const RESULT_COUNT = 6;
const RECENT_SHOWN_LIMIT = 18;

const userCache = new Map<string, CacheEntry>();
const recentlyShownByUser = new Map<string, string[]>();

export function clearPromotedArtistsCache() {
  userCache.clear();
  recentlyShownByUser.clear();
}

function rememberShown(plexToken: string, names: string[]) {
  const previous = recentlyShownByUser.get(plexToken) ?? [];
  const merged = [...names, ...previous];
  const deduped = Array.from(new Set(merged)).slice(0, RECENT_SHOWN_LIMIT);
  recentlyShownByUser.set(plexToken, deduped);
}

async function safeSimilar(name: string): Promise<SimilarArtist[]> {
  try {
    return await getSimilarArtists(name);
  } catch {
    return [];
  }
}

async function loadLibraryLookup(): Promise<LibraryLookup> {
  let mbids = new Set<string>();
  let names = new Set<string>();
  try {
    const result = await lidarrGet<LidarrArtist[]>("/artist");
    if (result.ok) {
      mbids = new Set(result.data.map((a) => a.foreignArtistId));
      names = new Set(result.data.map((a) => a.artistName.toLowerCase()));
    }
  } catch {
    // Lidarr unavailable — treat all as not in library
  }
  return (name, mbid) =>
    (mbid !== "" && mbids.has(mbid)) || names.has(name.toLowerCase());
}

function mergeSimilar(
  similarLists: SimilarArtist[][],
  excludeNames: Set<string>
): SimilarArtist[] {
  const byName = new Map<string, SimilarArtist>();

  for (const list of similarLists) {
    for (const artist of list) {
      const key = artist.name.toLowerCase();
      if (excludeNames.has(key)) continue;

      const existing = byName.get(key);
      if (!existing || artist.match > existing.match) {
        byName.set(key, artist);
      }
    }
  }

  return Array.from(byName.values());
}

function pickArtists(
  merged: SimilarArtist[],
  recentlyShown: Set<string>
): SimilarArtist[] {
  const fresh = merged.filter((a) => !recentlyShown.has(a.name.toLowerCase()));
  const pool = fresh.length >= RESULT_COUNT ? fresh : merged;
  return shuffle(pool).slice(0, RESULT_COUNT);
}

export async function getPromotedArtists(
  plexToken: string,
  forceRefresh = false
): Promise<PromotedArtistsResult> {
  const config = getConfigValue("promotedAlbum");
  const cacheDurationMs = config.cacheDurationMinutes * 60 * 1000;

  const cached = userCache.get(plexToken);
  if (
    !forceRefresh &&
    cached &&
    Date.now() - cached.cachedAt < cacheDurationMs
  ) {
    return cached.result;
  }

  const topArtists = await getTopArtists(
    plexToken,
    config.topArtistsCount,
    config.topArtistsRange
  );
  if (topArtists.length === 0) return null;

  const seeds = weightedRandomPick(
    topArtists,
    (a) => a.viewCount,
    config.pickedArtistsCount
  );
  if (seeds.length === 0) return null;

  const similarLists = await Promise.all(
    seeds.map((seed) => safeSimilar(seed.name))
  );

  const topNames = new Set(topArtists.map((a) => a.name.toLowerCase()));
  const merged = mergeSimilar(similarLists, topNames);
  if (merged.length === 0) return null;

  const recentlyShown = new Set(recentlyShownByUser.get(plexToken) ?? []);
  const chosen = pickArtists(merged, recentlyShown);

  const enriched = await enrichArtistsWithImages(chosen);
  const inLibrary = await loadLibraryLookup();

  const artists: PromotedArtist[] = enriched.map((a) => ({
    name: a.name,
    mbid: a.mbid,
    imageUrl: a.imageUrl,
    match: a.match,
    inLibrary: inLibrary(a.name, a.mbid),
  }));

  const result: PromotedArtistsResult = {
    artists,
    seedArtists: seeds.map((s) => s.name),
  };

  rememberShown(
    plexToken,
    artists.map((a) => a.name.toLowerCase())
  );
  userCache.set(plexToken, { result, cachedAt: Date.now() });

  return result;
}
