import type { AppleSearchResponse } from './types';

const ITUNES_SEARCH_BASE = 'https://itunes.apple.com/search';

/**
 * Search for an artist on Apple Music and return their artwork URL
 * @returns artworkUrl (300x300) or empty string if not found
 */
export const getArtistArtwork = async (
  artistName: string
): Promise<string> => {
  const params = new URLSearchParams({
    term: artistName,
    entity: 'musicArtist',
    limit: '1',
  });

  const url = `${ITUNES_SEARCH_BASE}?${params.toString()}`;
  const response = await fetch(url);
  const data: AppleSearchResponse = await response.json();

  if (data.resultCount > 0 && data.results[0].artworkUrl100) {
    // Apple returns 100x100 by default, but we can request larger sizes
    // by replacing the size in the URL
    return data.results[0].artworkUrl100.replace('100x100', '300x300');
  }

  return '';
};

/**
 * Batch fetch artwork URLs for multiple artists
 * @returns Map of artist name (lowercase) to artwork URL
 */
export const getArtistsArtwork = async (
  artistNames: string[]
): Promise<Map<string, string>> => {
  const results = await Promise.all(
    artistNames.map(async (name) => {
      const artworkUrl = await getArtistArtwork(name);
      return { name: name.toLowerCase(), artworkUrl };
    })
  );

  return new Map(results.map((r) => [r.name, r.artworkUrl]));
};
