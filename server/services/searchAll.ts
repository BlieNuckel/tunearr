import { searchReleaseGroups } from "../api/musicbrainz/releaseGroups";
import { searchArtists } from "../api/musicbrainz/artists";
import { isMbUnavailableError } from "../api/musicbrainz/errors";
import { getArtistsImages } from "../api/deezer/artists";
import { createLogger } from "../logger";
import type {
  ArtistInfo,
  MusicBrainzReleaseGroup,
} from "../api/musicbrainz/types";

export type SearchPart = "albums" | "artists";

type ArtistResult = ArtistInfo & { imageUrl?: string };

type AlbumResult = {
  "release-groups": MusicBrainzReleaseGroup[];
  count: number;
};

type PartState<T> =
  | { settled: false }
  | { settled: true; ok: true; value: T }
  | { settled: true; ok: false; error: unknown };

type Tracked<T> = { state: PartState<T>; done: Promise<void> };

/**
 * Whatever made it in time. A part listed in `partial` is still loading into the
 * cache (or MusicBrainz is busy); asking again for just that part picks it up.
 */
export type SearchAllResult = {
  "release-groups"?: MusicBrainzReleaseGroup[];
  count?: number;
  artists?: ArtistResult[];
  partial: SearchPart[];
  retryAfterMs?: number;
};

export const SEARCH_PARTS: readonly SearchPart[] = ["albums", "artists"];

const ARTIST_SCORE_THRESHOLD = 85;
const ARTIST_RESULT_LIMIT = 5;

/** Once one part is back, the other gets this long before it is reported partial. */
export const SEARCH_GRACE_MS = 1500;

/** What to suggest when a part simply wasn't back yet. */
const PENDING_RETRY_AFTER_MS = 1000;

const log = createLogger("search");

/** Keep only the strongest artist matches so they don't bury album results */
function topArtists(artists: ArtistInfo[]): ArtistInfo[] {
  return artists
    .filter((a) => (a.score ?? 0) >= ARTIST_SCORE_THRESHOLD)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, ARTIST_RESULT_LIMIT);
}

export async function enrichArtistsWithImages(
  artists: ArtistInfo[]
): Promise<ArtistResult[]> {
  const images = await getArtistsImages(artists.map((a) => a.name));
  return artists.map((a) => ({
    ...a,
    imageUrl: images.get(a.name.toLowerCase()) || undefined,
  }));
}

async function loadAlbums(query: string): Promise<AlbumResult> {
  const result = await searchReleaseGroups(query);
  return { "release-groups": result["release-groups"], count: result.count };
}

async function loadArtists(query: string): Promise<ArtistResult[]> {
  return enrichArtistsWithImages(topArtists(await searchArtists(query)));
}

function track<T>(promise: Promise<T>): Tracked<T> {
  const tracked: Tracked<T> = {
    state: { settled: false },
    done: Promise.resolve(),
  };
  tracked.done = promise.then(
    (value) => {
      tracked.state = { settled: true, ok: true, value };
    },
    (error: unknown) => {
      tracked.state = { settled: true, ok: false, error };
    }
  );
  return tracked;
}

/** Resolve when every part is back, or SEARCH_GRACE_MS after the first one is. */
async function waitWithGrace(parts: Tracked<unknown>[]): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const all = Promise.all(parts.map((p) => p.done));
  const grace = Promise.race(parts.map((p) => p.done)).then(
    () =>
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, SEARCH_GRACE_MS);
      })
  );
  await Promise.race([all, grace]);
  clearTimeout(timer);
}

/**
 * The value of a settled part, or null when it is partial. A busy MusicBrainz
 * makes a part partial rather than failing the search; any other error still
 * fails it.
 */
function readPart<T>(
  part: SearchPart,
  tracked: Tracked<T>,
  result: SearchAllResult
): T | null {
  const { state } = tracked;
  if (state.settled && state.ok) return state.value;

  if (state.settled && !isMbUnavailableError(state.error)) throw state.error;

  const retryAfterMs =
    state.settled && isMbUnavailableError(state.error)
      ? (state.error.retryAfterMs ?? PENDING_RETRY_AFTER_MS)
      : PENDING_RETRY_AFTER_MS;
  result.partial.push(part);
  result.retryAfterMs = Math.max(result.retryAfterMs ?? 0, retryAfterMs);
  log.info(`Search part ${part} is partial; the client will ask again`);
  return null;
}

/**
 * Search albums and artists side by side, returning what made it. A slow artist
 * search must not hold back album results, nor the reverse; whatever is still
 * running keeps going and lands in the cache for the follow-up request.
 */
export async function searchAll(
  query: string,
  parts: readonly SearchPart[] = SEARCH_PARTS
): Promise<SearchAllResult> {
  const albums = parts.includes("albums") ? track(loadAlbums(query)) : null;
  const artists = parts.includes("artists") ? track(loadArtists(query)) : null;

  await waitWithGrace([albums, artists].filter((p) => p !== null));

  const result: SearchAllResult = { partial: [] };
  const albumValue = albums ? readPart("albums", albums, result) : null;
  const artistValue = artists ? readPart("artists", artists, result) : null;

  if (albumValue) {
    result["release-groups"] = albumValue["release-groups"];
    result.count = albumValue.count;
  }
  if (artistValue) result.artists = artistValue;
  if (result.partial.length === 0) delete result.retryAfterMs;

  return result;
}

/** Parse `?parts=albums,artists`. Missing or unrecognized means all parts. */
export function parseSearchParts(raw: unknown): SearchPart[] {
  if (typeof raw !== "string") return [...SEARCH_PARTS];
  const requested = raw
    .split(",")
    .map((p) => p.trim())
    .filter((p): p is SearchPart => SEARCH_PARTS.includes(p as SearchPart));
  return requested.length > 0 ? requested : [...SEARCH_PARTS];
}
