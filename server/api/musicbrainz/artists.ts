import { mbJson } from "./config";
import { mbCached, mbPrime, MB_TTL } from "./cache";
import type { MbPriority } from "./queue";
import type {
  ArtistInfo,
  MusicBrainzArtist,
  MusicBrainzArtistSearchResponse,
} from "./types";

/** @param artist Raw MusicBrainz artist entity */
function toArtistInfo(artist: MusicBrainzArtist): ArtistInfo {
  return {
    mbid: artist.id,
    name: artist.name,
    score: artist.score,
    disambiguation: artist.disambiguation || undefined,
    type: artist.type || undefined,
    country: artist.country || undefined,
  };
}

/** A lookup carries no search score, so a primed entry must not either. */
function primeArtists(artists: MusicBrainzArtist[]): void {
  for (const artist of artists) {
    if (!artist.id) continue;
    const { score: _score, ...info } = toArtistInfo(artist);
    mbPrime({ key: `artist:${artist.id}`, ttlSeconds: MB_TTL.slow }, info);
  }
}

async function loadArtistMbid(
  name: string,
  priority: MbPriority
): Promise<string | null> {
  const path = `/artist/?query=${encodeURIComponent(name)}&limit=1&fmt=json`;
  const data = await mbJson<MusicBrainzArtistSearchResponse>(path, priority);
  return data?.artists?.[0]?.id ?? null;
}

async function loadArtistById(
  mbid: string,
  priority: MbPriority
): Promise<ArtistInfo | null> {
  const data = await mbJson<MusicBrainzArtist>(
    `/artist/${mbid}?fmt=json`,
    priority
  );
  if (!data?.id) return null;
  return toArtistInfo(data);
}

async function loadArtistSearch(
  query: string,
  priority: MbPriority
): Promise<ArtistInfo[]> {
  const path = `/artist/?query=${encodeURIComponent(query)}&limit=25&fmt=json`;
  const data = await mbJson<MusicBrainzArtistSearchResponse>(path, priority);
  const artists = data?.artists ?? [];
  primeArtists(artists);
  return artists.map(toArtistInfo);
}

/**
 * Resolve an artist name to its top-matching MusicBrainz artist MBID. Returns
 * null when no match is found; a lookup that fails outright also returns null
 * and is not cached, so it will be retried.
 */
export async function getArtistMbidByName(
  name: string,
  priority: MbPriority = "interactive"
): Promise<string | null> {
  try {
    return await mbCached(
      {
        key: `artist-mbid:${name.toLowerCase()}`,
        ttlSeconds: MB_TTL.immutable,
        priority,
      },
      (p) => loadArtistMbid(name, p)
    );
  } catch {
    return null;
  }
}

/** Look up a single artist by MBID. Returns null when the artist doesn't exist. */
export function getArtistById(
  mbid: string,
  priority: MbPriority = "interactive"
): Promise<ArtistInfo | null> {
  return mbCached(
    { key: `artist:${mbid}`, ttlSeconds: MB_TTL.slow, priority },
    (p) => loadArtistById(mbid, p)
  );
}

/** Search for artists by name, returning lightweight artist entities. */
export function searchArtists(
  query: string,
  priority: MbPriority = "interactive"
): Promise<ArtistInfo[]> {
  return mbCached(
    {
      key: `artist-search:${query.toLowerCase()}`,
      ttlSeconds: MB_TTL.volatile,
      priority,
    },
    (p) => loadArtistSearch(query, p)
  );
}
