import { MB_BASE, MB_HEADERS, rateLimitedMbFetch } from "./config";
import type { MusicBrainzArtistSearchResponse } from "./types";

const mbidCache = new Map<string, string | null>();

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
