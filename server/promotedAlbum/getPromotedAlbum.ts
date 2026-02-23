import { getTopArtists } from "../api/plex/topArtists";
import { getArtistTopTags } from "../api/lastfm/artists";
import { getTopAlbumsByTag } from "../api/lastfm/albums";
import { lidarrGet } from "../api/lidarr/get";
import type { LidarrAlbum, LidarrArtist } from "../api/lidarr/types";
import { getReleaseGroupIdFromRelease } from "../api/musicbrainz/releaseGroups";
import type {
  PromotedAlbumResult,
  RecommendationTrace,
  TraceArtistEntry,
  TraceAlbumPoolInfo,
  TraceSelectionReason,
  TraceWeightedTag,
} from "./types";

export type { PromotedAlbumResult } from "./types";

type WeightedTag = { name: string; weight: number };

type TagAccumulator = { weight: number; fromArtists: Set<string> };

type TagResultEntry = {
  artist: { name: string; viewCount: number };
  tags: { name: string; count: number }[];
};

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

function mergeTagsFromResults(tagResults: TagResultEntry[]): {
  weightedTags: WeightedTag[];
  tagMap: Map<string, TagAccumulator>;
} {
  const tagMap = new Map<string, TagAccumulator>();

  for (const { artist, tags } of tagResults) {
    const filtered = tags
      .filter((t) => !GENERIC_TAGS.has(t.name.toLowerCase()))
      .slice(0, 5);

    for (const tag of filtered) {
      const key = tag.name.toLowerCase();
      const existing = tagMap.get(key);
      const weight = tag.count * artist.viewCount;

      if (existing) {
        existing.weight += weight;
        existing.fromArtists.add(artist.name);
      } else {
        tagMap.set(key, {
          weight,
          fromArtists: new Set([artist.name]),
        });
      }
    }
  }

  const weightedTags: WeightedTag[] = Array.from(tagMap.entries()).map(
    ([key, { weight }]) => {
      const originalName =
        tagResults
          .flatMap((r) => r.tags)
          .find((t) => t.name.toLowerCase() === key)?.name ?? key;
      return { name: originalName, weight };
    }
  );

  return { weightedTags, tagMap };
}

function buildTrace(
  plexArtists: { name: string; viewCount: number }[],
  pickedArtistNames: Set<string>,
  tagResults: TagResultEntry[],
  tagMap: Map<string, TagAccumulator>,
  chosenTag: WeightedTag,
  albumPool: TraceAlbumPoolInfo,
  selectionReason: TraceSelectionReason
): RecommendationTrace {
  const traceArtists: TraceArtistEntry[] = plexArtists.map((a) => {
    const picked = pickedArtistNames.has(a.name);
    const result = tagResults.find((r) => r.artist.name === a.name);
    const filtered = (result?.tags ?? [])
      .filter((t) => !GENERIC_TAGS.has(t.name.toLowerCase()))
      .slice(0, 5);

    return {
      name: a.name,
      viewCount: a.viewCount,
      picked,
      tagContributions: picked
        ? filtered.map((t) => ({
            tagName: t.name,
            rawCount: t.count,
            weight: t.count * a.viewCount,
          }))
        : [],
    };
  });

  const traceWeightedTags: TraceWeightedTag[] = Array.from(
    tagMap.entries()
  ).map(([key, { weight, fromArtists }]) => {
    const originalName =
      tagResults
        .flatMap((r) => r.tags)
        .find((t) => t.name.toLowerCase() === key)?.name ?? key;
    return { name: originalName, weight, fromArtists: Array.from(fromArtists) };
  });

  return {
    plexArtists: traceArtists,
    weightedTags: traceWeightedTags,
    chosenTag: { name: chosenTag.name, weight: chosenTag.weight },
    albumPool,
    selectionReason,
  };
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
  let libraryAlbumMbids = new Set<string>();
  try {
    const [artistResult, albumResult] = await Promise.all([
      lidarrGet<LidarrArtist[]>("/artist"),
      lidarrGet<LidarrAlbum[]>("/album"),
    ]);
    if (artistResult.ok) {
      libraryArtistMbids = new Set(
        artistResult.data.map((a) => a.foreignArtistId)
      );
    }
    if (albumResult.ok) {
      libraryAlbumMbids = new Set(
        albumResult.data.map((a) => a.foreignAlbumId)
      );
    }
  } catch {
    // Lidarr unavailable — treat all as not in library
  }

  const artistInLibrary = (artistMbid: string) =>
    libraryArtistMbids.has(artistMbid);
  const albumInLibrary = (rgMbid: string) => libraryAlbumMbids.has(rgMbid);

  const plexArtists = await getTopArtists(10);
  if (plexArtists.length === 0) return null;

  const pickedArtists = weightedRandomPick(plexArtists, (a) => a.viewCount, 3);
  const pickedArtistNames = new Set(pickedArtists.map((a) => a.name));

  const tagResults: TagResultEntry[] = await Promise.all(
    pickedArtists.map(async (artist) => {
      try {
        const tags = await getArtistTopTags(artist.name);
        return { artist, tags };
      } catch {
        return { artist, tags: [] };
      }
    })
  );

  const { weightedTags, tagMap } = mergeTagsFromResults(tagResults);

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

  let chosenAlbum: { album: (typeof shuffled)[0]; rgMbid: string } | undefined;
  let fallbackAlbum:
    | { album: (typeof shuffled)[0]; rgMbid: string }
    | undefined;

  for (const album of shuffled) {
    const releaseGroupId = await getReleaseGroupIdFromRelease(album.mbid);
    if (!releaseGroupId) continue;

    if (!artistInLibrary(album.artistMbid)) {
      chosenAlbum = { album, rgMbid: releaseGroupId };
      break;
    }
    if (!fallbackAlbum) {
      fallbackAlbum = { album, rgMbid: releaseGroupId };
    }
  }

  const picked = chosenAlbum ?? fallbackAlbum;
  if (!picked) return null;

  const selectionReason: TraceSelectionReason = chosenAlbum
    ? "preferred_non_library"
    : "fallback_in_library";

  const albumPoolInfo: TraceAlbumPoolInfo = {
    page1Count: page1.albums.length,
    deepPage: Number(deepPage),
    deepPageCount: pageDeep.albums.length,
    totalAfterDedup: allAlbums.length,
  };

  const trace = buildTrace(
    plexArtists,
    pickedArtistNames,
    tagResults,
    tagMap,
    chosenTag,
    albumPoolInfo,
    selectionReason
  );

  const result: PromotedAlbumResult = {
    album: {
      name: picked.album.name,
      mbid: picked.rgMbid,
      artistName: picked.album.artistName,
      artistMbid: picked.album.artistMbid,
      coverUrl: `https://coverartarchive.org/release-group/${picked.rgMbid}/front-500`,
    },
    tag: chosenTag.name,
    inLibrary: albumInLibrary(picked.rgMbid),
    trace,
  };

  cachedResult = result;
  cachedAt = Date.now();

  return result;
}
