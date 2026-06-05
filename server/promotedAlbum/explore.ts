import { getSimilarArtists } from "../api/listenbrainz/similarArtists";
import { getArtistMbidByName } from "../api/musicbrainz/artists";
import { fetchReleaseGroupsForArtist } from "../api/musicbrainz/releaseGroups";
import { getArtistTopTags } from "../api/lastfm/artists";
import type { MusicBrainzReleaseGroup } from "../api/musicbrainz/types";
import type { ListenBrainzSimilarArtist } from "../api/listenbrainz/types";
import type { PromotedAlbumConfig } from "../config";
import { weightedRandomPick, shuffle } from "../utils/random";
import type {
  BuiltAlbum,
  ExploreResult,
  ExploreTrace,
  TraceSelectionReason,
  TraceSimilarArtist,
} from "./types";

type SeedArtist = { name: string; viewCount: number };

type ExploreContext = {
  plexArtists: SeedArtist[];
  config: PromotedAlbumConfig;
  recentlyShown: Set<string>;
  artistInLibrary: (artistMbid: string) => boolean;
  albumInLibrary: (rgMbid: string) => boolean;
};

type EvaluatedCandidate = {
  candidate: ListenBrainzSimilarArtist;
  genres: Set<string>;
  overlap: number;
  isDifferentGenre: boolean;
};

const SEED_GENRE_LIMIT = 8;

async function safeTopTags(
  name: string
): Promise<{ name: string; count: number }[]> {
  try {
    return await getArtistTopTags(name);
  } catch {
    return [];
  }
}

function buildGenreSet(
  tags: { name: string; count: number }[],
  genericTags: Set<string>,
  limit: number
): Set<string> {
  const set = new Set<string>();
  for (const t of tags) {
    const name = t.name.toLowerCase();
    if (genericTags.has(name)) continue;
    set.add(name);
    if (set.size >= limit) break;
  }
  return set;
}

/** Jaccard similarity of two genre sets (0 = disjoint, 1 = identical). */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function evaluateCandidates(
  candidates: ListenBrainzSimilarArtist[],
  tagSets: { name: string; count: number }[][],
  seedGenres: Set<string>,
  genericTags: Set<string>,
  threshold: number
): EvaluatedCandidate[] {
  return candidates.map((candidate, i) => {
    const genres = buildGenreSet(tagSets[i], genericTags, SEED_GENRE_LIMIT);
    const overlap = jaccard(seedGenres, genres);
    return {
      candidate,
      genres,
      overlap,
      isDifferentGenre: genres.size > 0 && overlap <= threshold,
    };
  });
}

async function pickAlbumFromArtist(
  artistMbid: string,
  recentlyShown: Set<string>
): Promise<MusicBrainzReleaseGroup | null> {
  const releaseGroups = await fetchReleaseGroupsForArtist(artistMbid);
  const albums = releaseGroups.filter(
    (rg) => rg["primary-type"] === "Album" && rg["first-release-date"] && rg.id
  );
  if (albums.length === 0) return null;

  const shuffled = shuffle(albums);
  const fresh = shuffled.filter((rg) => !recentlyShown.has(rg.id));
  const pool = fresh.length > 0 ? fresh : shuffled;
  return pool[0] ?? null;
}

function buildExploreTrace(
  seedArtist: string,
  seedGenres: Set<string>,
  evaluated: EvaluatedCandidate[],
  chosen: EvaluatedCandidate,
  newGenres: string[],
  selectionReason: TraceSelectionReason
): ExploreTrace {
  const candidates: TraceSimilarArtist[] = evaluated.map((e) => ({
    name: e.candidate.name,
    score: e.candidate.score,
    genres: [...e.genres],
    genreOverlap: e.overlap,
    isDifferentGenre: e.isDifferentGenre,
    chosen: e.candidate.artist_mbid === chosen.candidate.artist_mbid,
  }));

  return {
    kind: "explore",
    seedArtist,
    seedGenres: [...seedGenres],
    candidates,
    chosenArtist: chosen.candidate.name,
    chosenGenres: [...chosen.genres],
    newGenres,
    selectionReason,
  };
}

function assembleResult(
  ctx: ExploreContext,
  seedArtist: string,
  seedGenres: Set<string>,
  evaluated: EvaluatedCandidate[],
  chosen: EvaluatedCandidate,
  album: MusicBrainzReleaseGroup
): BuiltAlbum {
  const newGenres = [...chosen.genres].filter((g) => !seedGenres.has(g));
  const selectionReason: TraceSelectionReason = ctx.artistInLibrary(
    chosen.candidate.artist_mbid
  )
    ? "fallback_in_library"
    : "preferred_non_library";

  const result: ExploreResult = {
    mode: "explore",
    album: {
      name: album.title,
      mbid: album.id,
      artistName: chosen.candidate.name,
      artistMbid: chosen.candidate.artist_mbid,
      coverUrl: `https://coverartarchive.org/release-group/${album.id}/front-500`,
      year: (album["first-release-date"] || "").slice(0, 4),
    },
    seedArtist,
    newGenres,
    inLibrary: ctx.albumInLibrary(album.id),
    trace: buildExploreTrace(
      seedArtist,
      seedGenres,
      evaluated,
      chosen,
      newGenres,
      selectionReason
    ),
  };

  return { result, rememberKey: album.id };
}

/**
 * "Similar vibe, different genre": seed from a top Plex artist, find artists
 * people play alongside them (ListenBrainz), keep only those in a genre the
 * seed doesn't share, and surface an album by one of them. Returns null when no
 * genre-distant candidate yields an album — the caller falls back to
 * within-taste.
 */
export async function buildExploreResult(
  ctx: ExploreContext
): Promise<BuiltAlbum | null> {
  const { plexArtists, config, recentlyShown } = ctx;
  const genericTags = new Set(config.genericTags.map((t) => t.toLowerCase()));

  const [seed] = weightedRandomPick(plexArtists, (a) => a.viewCount, 1);
  if (!seed) return null;

  const seedMbid = await getArtistMbidByName(seed.name);
  if (!seedMbid) return null;

  const similar = await getSimilarArtists(seedMbid);
  if (similar.length === 0) return null;

  const seedGenres = buildGenreSet(
    await safeTopTags(seed.name),
    genericTags,
    SEED_GENRE_LIMIT
  );
  if (seedGenres.size === 0) return null;

  const candidates = similar.slice(0, config.exploreCandidateCount);
  const tagSets = await Promise.all(candidates.map((c) => safeTopTags(c.name)));
  const evaluated = evaluateCandidates(
    candidates,
    tagSets,
    seedGenres,
    genericTags,
    config.genreOverlapThreshold
  );

  const ranked = evaluated
    .filter((e) => e.isDifferentGenre)
    .sort((a, b) => b.candidate.score - a.candidate.score);

  for (const chosen of ranked) {
    const album = await pickAlbumFromArtist(
      chosen.candidate.artist_mbid,
      recentlyShown
    );
    if (album) {
      return assembleResult(
        ctx,
        seed.name,
        seedGenres,
        evaluated,
        chosen,
        album
      );
    }
  }

  return null;
}
