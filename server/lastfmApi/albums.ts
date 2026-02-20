import { buildUrl } from "./config";
import type { LastfmTagAlbumsResponse } from "./types";

export const getTopAlbumsByTag = async (
  tag: string,
  page = "1",
  limit = "50"
) => {
  const url = buildUrl("tag.getTopAlbums", { tag, page, limit });
  const response = await fetch(url);
  const data: LastfmTagAlbumsResponse = await response.json();

  if (data.error) {
    throw new Error(data.message || "Last.fm API error");
  }

  const albumsContainer = data.albums;
  const albums = (albumsContainer?.album || []).map((a) => {
    const largeImage = a.image?.find((img) => img.size === 'large');
    const extralargeImage = a.image?.find((img) => img.size === 'extralarge');
    const imageUrl = extralargeImage?.['#text'] || largeImage?.['#text'] || '';

    return {
      name: a.name,
      mbid: a.mbid || '',
      artistName: a.artist?.name || '',
      artistMbid: a.artist?.mbid || '',
      imageUrl,
    };
  });

  const attr = albumsContainer?.["@attr"];
  return {
    albums,
    pagination: {
      page: Number(attr?.page) || 1,
      totalPages: Number(attr?.totalPages) || 1,
    },
  };
};
