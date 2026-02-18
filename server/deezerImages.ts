const DEEZER_SEARCH = "https://api.deezer.com/search/artist";

const cache = new Map<string, string>();

/** Fetch an artist image URL from Deezer's free API, with in-memory caching */
export async function getArtistImage(artistName: string): Promise<string> {
  const key = artistName.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  try {
    const res = await fetch(
      `${DEEZER_SEARCH}?q=${encodeURIComponent(artistName)}&limit=1`,
    );
    if (!res.ok) return "";

    const data = await res.json();
    const artist = data.data?.[0];
    const imageUrl = artist?.picture_big || artist?.picture_medium || "";

    cache.set(key, imageUrl);
    return imageUrl;
  } catch {
    return "";
  }
}

/** Enrich an array of artists that have an imageUrl field, filling in blanks from Deezer */
export async function enrichWithImages<
  T extends { name: string; imageUrl: string },
>(artists: T[]): Promise<T[]> {
  const needsImage = artists.filter((a) => !a.imageUrl);
  if (needsImage.length === 0) return artists;

  await Promise.all(
    needsImage.map(async (a) => {
      a.imageUrl = await getArtistImage(a.name);
    }),
  );

  return artists;
}
