import { buildUrl } from "./config";
import type {
  LastfmSimilarResponse,
  LastfmTopTagsResponse,
  LastfmTagArtistsResponse,
} from "./types";

export const getSimilarArtists = async (artist: string) => {
  const url = buildUrl("artist.getSimilar", { artist, limit: "30" });
  const response = await fetch(url);
  const data: LastfmSimilarResponse = await response.json();

  if (data.error) {
    throw new Error(data.message || "Last.fm API error");
  }

  return (data.similarartists?.artist || []).map((a) => {
    const largeImage = a.image?.find((img) => img.size === "large");
    const extralargeImage = a.image?.find((img) => img.size === "extralarge");
    const imageUrl = extralargeImage?.["#text"] || largeImage?.["#text"] || "";

    return {
      name: a.name,
      mbid: a.mbid || "",
      match: parseFloat(a.match),
      imageUrl,
    };
  });
};

export const getArtistTopTags = async (artist: string) => {
  const url = buildUrl("artist.getTopTags", { artist });
  const response = await fetch(url);
  const data: LastfmTopTagsResponse = await response.json();

  if (data.error) {
    throw new Error(data.message || "Last.fm API error");
  }

  return (data.toptags?.tag || []).map((t) => ({
    name: t.name,
    count: Number(t.count),
  }));
};

const fetchSingleTagArtists = async (tag: string, page = "1") => {
  const url = buildUrl("tag.getTopArtists", { tag, limit: "30", page });
  const response = await fetch(url);
  const data: LastfmTagArtistsResponse = await response.json();

  if (data.error) {
    throw new Error(data.message || "Last.fm API error");
  }

  const topartists = data.topartists;
  const artists = (topartists?.artist || []).map((a, index) => {
    const largeImage = a.image?.find((img) => img.size === "large");
    const extralargeImage = a.image?.find((img) => img.size === "extralarge");
    const imageUrl = extralargeImage?.["#text"] || largeImage?.["#text"] || "";

    return {
      name: a.name,
      mbid: a.mbid || "",
      imageUrl,
      rank: index + 1,
    };
  });

  const attr = topartists?.["@attr"];
  return {
    artists,
    pagination: {
      page: Number(attr?.page) || 1,
      totalPages: Number(attr?.totalPages) || 1,
    },
  };
};

export const getTopArtistsByTag = async (tags: string[], page = "1") => {
  if (tags.length === 0) {
    return {
      artists: [],
      pagination: { page: 1, totalPages: 1 },
    };
  }

  if (tags.length === 1) {
    return fetchSingleTagArtists(tags[0], page);
  }

  const results = await Promise.all(
    tags.map((tag) => fetchSingleTagArtists(tag, page))
  );

  const artistsByName = new Map<
    string,
    { count: number; artist: (typeof results)[0]["artists"][0] }
  >();

  for (const result of results) {
    for (const artist of result.artists) {
      const key = artist.name.toLowerCase();
      const existing = artistsByName.get(key);
      if (existing) {
        existing.count += 1;
        if (artist.mbid && !existing.artist.mbid) {
          existing.artist.mbid = artist.mbid;
        }
        if (artist.imageUrl && !existing.artist.imageUrl) {
          existing.artist.imageUrl = artist.imageUrl;
        }
      } else {
        artistsByName.set(key, { count: 1, artist });
      }
    }
  }

  const artists = Array.from(artistsByName.values())
    .filter((entry) => entry.count === tags.length)
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return a.artist.rank - b.artist.rank;
    })
    .map((entry, index) => ({
      ...entry.artist,
      rank: index + 1,
    }));

  return {
    artists,
    pagination: {
      page: Number(page) || 1,
      totalPages: 1,
    },
  };
};
