import { resilientFetch } from "../resilientFetch";
import { MB_BASE, MB_HEADERS, rateLimitedMbFetch } from "./config";
import type {
  ArtistInfo,
  MusicBrainzArtist,
  MusicBrainzArtistSearchResponse,
} from "./types";

const mbidCache = new Map<string, string | null>();

/** @param artist Raw MusicBrainz artist entity */
function toArtistInfo(artist: MusicBrainzArtist): ArtistInfo {
  return {
    mbid: artist.id,
    name: artist.name,
    disambiguation: artist.disambiguation || undefined,
    type: artist.type || undefined,
    country: artist.country || undefined,
  };
}

export function clearArtistMbidCache() {
  mbidCache.clear();
}

/**
 * Resolve an artist name to its top-matching MusicBrainz artist MBID. Results
 * are cached for the process lifetime (including misses). Returns null when no
 * match is found; transient fetch failures are not cached.
 */
export async function getArtistMbidByName(
  name: string
): Promise<string | null> {
  const key = name.toLowerCase();
  const cached = mbidCache.get(key);
  if (cached !== undefined) return cached;

  const url = `${MB_BASE}/artist/?query=${encodeURIComponent(name)}&limit=1&fmt=json`;
  try {
    const response = await rateLimitedMbFetch(url, { headers: MB_HEADERS });
    if (!response.ok) return null;

    const data: MusicBrainzArtistSearchResponse = await response.json();
    const mbid = data.artists?.[0]?.id ?? null;
    mbidCache.set(key, mbid);
    return mbid;
  } catch {
    return null;
  }
}

/** Look up a single artist by MBID. Returns null on a failed lookup. */
export async function getArtistById(mbid: string): Promise<ArtistInfo | null> {
  const url = `${MB_BASE}/artist/${mbid}?fmt=json`;
  const response = await rateLimitedMbFetch(url, { headers: MB_HEADERS });
  if (!response.ok) return null;

  const data: MusicBrainzArtist = await response.json();
  if (!data.id) return null;
  return toArtistInfo(data);
}

/** Search for artists by name, returning lightweight artist entities. */
export async function searchArtists(query: string): Promise<ArtistInfo[]> {
  const url = `${MB_BASE}/artist/?query=${encodeURIComponent(query)}&limit=25&fmt=json`;
  const response = await resilientFetch(url, { headers: MB_HEADERS });
  if (!response.ok) {
    throw new Error(`MusicBrainz returned ${response.status}`);
  }

  const data: MusicBrainzArtistSearchResponse = await response.json();
  return (data.artists ?? []).map(toArtistInfo);
}
