import { getArtistsImages } from "../api/deezer/artists";

type ArtistWithImage = { name: string; imageUrl: string };

export async function enrichArtistsWithImages<T extends ArtistWithImage>(
  artists: T[]
): Promise<T[]> {
  const imageMap = await getArtistsImages(artists.map((a) => a.name));
  return artists.map((a) => ({
    ...a,
    imageUrl: imageMap.get(a.name.toLowerCase()) || a.imageUrl,
  }));
}
