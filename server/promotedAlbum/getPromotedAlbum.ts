import { getTopAlbumsByTag } from "../lastfmApi/albums";
import { getArtistTopTags } from "../lastfmApi/artists";
import { lidarrGet } from "../lidarrApi/get";
import type { LidarrArtist } from "../lidarrApi/types";
import { getReleaseGroupIdFromRelease } from "../musicbrainzApi/releaseGroups";
import { getTopArtists } from "../plexApi/topArtists";

export type PromotedAlbumResult = {
  album: {
    name: string;
    mbid: string;
    artistName: string;
    artistMbid: string;
    coverUrl: string;
  };
  tag: string;
  inLibrary: boolean;
} | null;

type WeightedTag = { name: string; weight: number };

const GENERIC_TAGS = new Set([
  "seen live",
  "favorites",
  "favourite",
  "my favorite",
  "love",
  "awesome",
  "beautiful",
  "cool",
  "check out",
  "spotify",
  "under 2000 listeners",
  "all",
]);

const CACHE_DURATION_MS = 30 * 60 * 1000;

let cachedResult: PromotedAlbumResult = null;
let cachedAt = 0;

export function clearPromotedAlbumCache() {
  cachedResult = null;
  cachedAt = 0;
}

/** Pick items via weighted random without replacement */
function weightedRandomPick<T>(
  items: T[],
  getWeight: (item: T) => number,
  count: number
): T[] {
  const pool = items.map((item) => ({ item, weight: getWeight(item) }));
  const picked: T[] = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
    let r = Math.random() * totalWeight;

    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].weight;
      if (r <= 0) {
        picked.push(pool[j].item);
        pool.splice(j, 1);
        break;
      }
    }
  }

  return picked;
}

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function getPromotedAlbum(
  forceRefresh = false
): Promise<PromotedAlbumResult> {
  if (
    !forceRefresh &&
    cachedResult &&
    Date.now() - cachedAt < CACHE_DURATION_MS
  ) {
    return cachedResult;
  }

  let libraryArtistMbids = new Set<string>();
  try {
    const result = await lidarrGet<LidarrArtist[]>("/artist");
    if (result.ok) {
      libraryArtistMbids = new Set(result.data.map((a) => a.foreignArtistId));
    }
  } catch {
    // Lidarr unavailable — treat all as not in library
  }

  const inLibrary = (artistMbid: string) => libraryArtistMbids.has(artistMbid);

  const plexArtists = await getTopArtists(10);
  if (plexArtists.length === 0) return null;

  const pickedArtists = weightedRandomPick(plexArtists, (a) => a.viewCount, 3);

  const tagResults = await Promise.all(
    pickedArtists.map(async (artist) => {
      try {
        const tags = await getArtistTopTags(artist.name);
        return { artist, tags };
      } catch {
        return { artist, tags: [] };
      }
    })
  );

  const weightedTags: WeightedTag[] = [];

  for (const { artist, tags } of tagResults) {
    const filtered = tags
      .filter((t) => !GENERIC_TAGS.has(t.name.toLowerCase()))
      .slice(0, 5);

    for (const tag of filtered) {
      weightedTags.push({
        name: tag.name,
        weight: tag.count * artist.viewCount,
      });
    }
  }

  if (weightedTags.length === 0) return null;

  const [chosenTag] = weightedRandomPick(weightedTags, (t) => t.weight, 1);
  if (!chosenTag) return null;

  const deepPage = String(Math.floor(Math.random() * 9) + 2);
  const [page1, pageDeep] = await Promise.all([
    getTopAlbumsByTag(chosenTag.name, "1"),
    getTopAlbumsByTag(chosenTag.name, deepPage),
  ]);

  const seen = new Set<string>();
  const allAlbums = [...page1.albums, ...pageDeep.albums].filter((a) => {
    if (!a.mbid) return false;
    if (seen.has(a.mbid)) return false;
    seen.add(a.mbid);
    return true;
  });

  if (allAlbums.length === 0) return null;

  const shuffled = shuffle(allAlbums);

  // Convert Last.fm release MBIDs to release-group MBIDs
  // Do this sequentially (not in parallel) to avoid MusicBrainz rate limiting
  // Stop after finding enough valid albums
  let chosenAlbum;
  for (const album of shuffled) {
    const releaseGroupId = await getReleaseGroupIdFromRelease(album.mbid);
    if (releaseGroupId && !inLibrary(album.artistMbid)) {
      chosenAlbum = album;
      // Stop after finding a valid album
      if (chosenAlbum) break;
    }
  }

  if (!chosenAlbum) return null;

  const result: PromotedAlbumResult = {
    album: {
      name: chosenAlbum.name,
      mbid: chosenAlbum.mbid,
      artistName: chosenAlbum.artistName,
      artistMbid: chosenAlbum.artistMbid,
      coverUrl: `https://coverartarchive.org/release-group/${chosenAlbum.mbid}/front-500`,
    },
    tag: chosenTag.name,
    inLibrary: false,
  };

  cachedResult = result;
  cachedAt = Date.now();

  return result;
}
