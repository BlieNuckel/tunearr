import { getTopArtists } from "../plexApi/topArtists";
import { getArtistTopTags } from "../lastfmApi/artists";
import { getTopAlbumsByTag } from "../lastfmApi/albums";
import { lidarrGet } from "../lidarrApi/get";
import type { LidarrArtist } from "../lidarrApi/types";
import { getReleaseGroupIdFromRelease } from "../musicbrainzApi/releaseGroups";

type WeightedTag = { name: string; weight: number };

type LastfmAlbum = {
  name: string;
  mbid: string;
  artistName: string;
  artistMbid: string;
};

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

async function collectWeightedTags(
  artists: { name: string; viewCount: number }[]
): Promise<WeightedTag[]> {
  const tagResults = await Promise.all(
    artists.map(async (artist) => {
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
  return weightedTags;
}

async function fetchCandidateAlbums(tagName: string): Promise<LastfmAlbum[]> {
  const deepPage = String(Math.floor(Math.random() * 9) + 2);
  const [page1, pageDeep] = await Promise.all([
    getTopAlbumsByTag(tagName, "1"),
    getTopAlbumsByTag(tagName, deepPage),
  ]);

  const seen = new Set<string>();
  return [...page1.albums, ...pageDeep.albums].filter((a) => {
    if (!a.mbid) return false;
    if (seen.has(a.mbid)) return false;
    seen.add(a.mbid);
    return true;
  });
}

// Sequential to avoid MusicBrainz rate limiting — stops after finding enough
async function resolveReleaseGroupIds(
  albums: LastfmAlbum[],
  limit: number
): Promise<LastfmAlbum[]> {
  const resolved: LastfmAlbum[] = [];
  for (const album of albums) {
    const releaseGroupId = await getReleaseGroupIdFromRelease(album.mbid);
    if (releaseGroupId) {
      resolved.push({ ...album, mbid: releaseGroupId });
      if (resolved.length >= limit) break;
    }
  }
  return resolved;
}

async function getLibraryArtistMbids(): Promise<Set<string>> {
  try {
    const result = await lidarrGet<LidarrArtist[]>("/artist");
    if (result.ok) {
      return new Set(result.data.map((a) => a.foreignArtistId));
    }
  } catch {
    // Lidarr unavailable — treat all as not in library
  }
  return new Set();
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

  const plexArtists = await getTopArtists(10);
  if (plexArtists.length === 0) return null;

  const pickedArtists = weightedRandomPick(plexArtists, (a) => a.viewCount, 3);
  const weightedTags = await collectWeightedTags(pickedArtists);
  if (weightedTags.length === 0) return null;

  const [chosenTag] = weightedRandomPick(weightedTags, (t) => t.weight, 1);
  if (!chosenTag) return null;

  const allAlbums = await fetchCandidateAlbums(chosenTag.name);
  if (allAlbums.length === 0) return null;

  const validAlbums = await resolveReleaseGroupIds(shuffle(allAlbums), 10);
  if (validAlbums.length === 0) return null;

  const libraryArtistMbids = await getLibraryArtistMbids();
  const notInLibrary = validAlbums.find(
    (a) => !libraryArtistMbids.has(a.artistMbid)
  );

  const chosen = notInLibrary || validAlbums[0];
  const result: PromotedAlbumResult = {
    album: {
      name: chosen.name,
      mbid: chosen.mbid,
      artistName: chosen.artistName,
      artistMbid: chosen.artistMbid,
      coverUrl: `https://coverartarchive.org/release-group/${chosen.mbid}/front-500`,
    },
    tag: chosenTag.name,
    inLibrary: !notInLibrary,
  };

  cachedResult = result;
  cachedAt = Date.now();

  return result;
}
