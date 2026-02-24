import { getTopArtists } from "../api/plex/topArtists";
import { getArtistTopTags } from "../api/lastfm/artists";
import { getTopAlbumsByTag } from "../api/lastfm/albums";
import { lidarrGet } from "../api/lidarr/get";
import type { LidarrAlbum, LidarrArtist } from "../api/lidarr/types";
import { getReleaseGroupIdFromRelease } from "../api/musicbrainz/releaseGroups";
import type { ReleaseGroupInfo } from "../api/musicbrainz/types";
import { getConfigValue } from "../config";
import type { LibraryPreference } from "../config";
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

function mergeTagsFromResults(
  tagResults: TagResultEntry[],
  genericTags: Set<string>,
  tagsPerArtist: number
): {
  weightedTags: WeightedTag[];
  tagMap: Map<string, TagAccumulator>;
} {
  const tagMap = new Map<string, TagAccumulator>();

  for (const { artist, tags } of tagResults) {
    const filtered = tags
      .filter((t) => !genericTags.has(t.name.toLowerCase()))
      .slice(0, tagsPerArtist);

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
  selectionReason: TraceSelectionReason,
  genericTags: Set<string>,
  tagsPerArtist: number
): RecommendationTrace {
  const traceArtists: TraceArtistEntry[] = plexArtists.map((a) => {
    const picked = pickedArtistNames.has(a.name);
    const result = tagResults.find((r) => r.artist.name === a.name);
    const filtered = (result?.tags ?? [])
      .filter((t) => !genericTags.has(t.name.toLowerCase()))
      .slice(0, tagsPerArtist);

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

function selectAlbumPreferNew(
  shuffled: {
    mbid: string;
    artistMbid: string;
    name: string;
    artistName: string;
  }[],
  artistInLibrary: (mbid: string) => boolean,
  getRgInfo: (mbid: string) => Promise<ReleaseGroupInfo | null>
): Promise<{
  album: (typeof shuffled)[0];
  rgMbid: string;
  year: string;
  reason: TraceSelectionReason;
} | null> {
  return selectAlbumWithPreference(
    shuffled,
    (a) => !artistInLibrary(a.artistMbid),
    getRgInfo,
    "preferred_non_library",
    "fallback_in_library"
  );
}

function selectAlbumPreferLibrary(
  shuffled: {
    mbid: string;
    artistMbid: string;
    name: string;
    artistName: string;
  }[],
  artistInLibrary: (mbid: string) => boolean,
  getRgInfo: (mbid: string) => Promise<ReleaseGroupInfo | null>
): Promise<{
  album: (typeof shuffled)[0];
  rgMbid: string;
  year: string;
  reason: TraceSelectionReason;
} | null> {
  return selectAlbumWithPreference(
    shuffled,
    (a) => artistInLibrary(a.artistMbid),
    getRgInfo,
    "preferred_library",
    "fallback_non_library"
  );
}

async function selectAlbumNoPreference(
  shuffled: {
    mbid: string;
    artistMbid: string;
    name: string;
    artistName: string;
  }[],
  getRgInfo: (mbid: string) => Promise<ReleaseGroupInfo | null>
): Promise<{
  album: (typeof shuffled)[0];
  rgMbid: string;
  year: string;
  reason: TraceSelectionReason;
} | null> {
  for (const album of shuffled) {
    const rgInfo = await getRgInfo(album.mbid);
    if (rgInfo) {
      return {
        album,
        rgMbid: rgInfo.id,
        year: rgInfo.firstReleaseDate.slice(0, 4),
        reason: "no_preference",
      };
    }
  }
  return null;
}

async function selectAlbumWithPreference(
  shuffled: {
    mbid: string;
    artistMbid: string;
    name: string;
    artistName: string;
  }[],
  isPreferred: (album: (typeof shuffled)[0]) => boolean,
  getRgInfo: (mbid: string) => Promise<ReleaseGroupInfo | null>,
  preferredReason: TraceSelectionReason,
  fallbackReason: TraceSelectionReason
): Promise<{
  album: (typeof shuffled)[0];
  rgMbid: string;
  year: string;
  reason: TraceSelectionReason;
} | null> {
  let fallback:
    | { album: (typeof shuffled)[0]; rgMbid: string; year: string }
    | undefined;

  for (const album of shuffled) {
    const rgInfo = await getRgInfo(album.mbid);
    if (!rgInfo) continue;

    const year = rgInfo.firstReleaseDate.slice(0, 4);
    if (isPreferred(album)) {
      return { album, rgMbid: rgInfo.id, year, reason: preferredReason };
    }
    if (!fallback) {
      fallback = { album, rgMbid: rgInfo.id, year };
    }
  }

  return fallback ? { ...fallback, reason: fallbackReason } : null;
}

function selectAlbum(
  shuffled: {
    mbid: string;
    artistMbid: string;
    name: string;
    artistName: string;
  }[],
  artistInLibrary: (mbid: string) => boolean,
  libraryPreference: LibraryPreference,
  getRgInfo: (mbid: string) => Promise<ReleaseGroupInfo | null>
) {
  switch (libraryPreference) {
    case "prefer_new":
      return selectAlbumPreferNew(shuffled, artistInLibrary, getRgInfo);
    case "prefer_library":
      return selectAlbumPreferLibrary(shuffled, artistInLibrary, getRgInfo);
    case "no_preference":
      return selectAlbumNoPreference(shuffled, getRgInfo);
  }
}

export async function getPromotedAlbum(
  forceRefresh = false
): Promise<PromotedAlbumResult> {
  const config = getConfigValue("promotedAlbum");
  const cacheDurationMs = config.cacheDurationMinutes * 60 * 1000;

  if (
    !forceRefresh &&
    cachedResult &&
    Date.now() - cachedAt < cacheDurationMs
  ) {
    return cachedResult;
  }

  const genericTags = new Set(config.genericTags.map((t) => t.toLowerCase()));

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

  const plexArtists = await getTopArtists(config.topArtistsCount);
  if (plexArtists.length === 0) return null;

  const pickedArtists = weightedRandomPick(
    plexArtists,
    (a) => a.viewCount,
    config.pickedArtistsCount
  );
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

  const { weightedTags, tagMap } = mergeTagsFromResults(
    tagResults,
    genericTags,
    config.tagsPerArtist
  );

  if (weightedTags.length === 0) return null;

  const [chosenTag] = weightedRandomPick(weightedTags, (t) => t.weight, 1);
  if (!chosenTag) return null;

  const range = config.deepPageMax - config.deepPageMin + 1;
  const deepPage = String(
    Math.floor(Math.random() * range) + config.deepPageMin
  );
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

  const picked = await selectAlbum(
    shuffled,
    artistInLibrary,
    config.libraryPreference,
    getReleaseGroupIdFromRelease
  );
  if (!picked) return null;

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
    picked.reason,
    genericTags,
    config.tagsPerArtist
  );

  const result: PromotedAlbumResult = {
    album: {
      name: picked.album.name,
      mbid: picked.rgMbid,
      artistName: picked.album.artistName,
      artistMbid: picked.album.artistMbid,
      coverUrl: `https://coverartarchive.org/release-group/${picked.rgMbid}/front-500`,
      year: picked.year,
    },
    tag: chosenTag.name,
    inLibrary: albumInLibrary(picked.rgMbid),
    trace,
  };

  cachedResult = result;
  cachedAt = Date.now();

  return result;
}
