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

  return (data.similarartists?.artist || []).map((a) => ({
    name: a.name,
    mbid: a.mbid || "",
    match: parseFloat(a.match),
    imageUrl: "",
  }));
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

export const getTopArtistsByTag = async (tag: string, page = "1") => {
  const url = buildUrl("tag.getTopArtists", { tag, limit: "30", page });
  const response = await fetch(url);
  const data: LastfmTagArtistsResponse = await response.json();

  if (data.error) {
    throw new Error(data.message || "Last.fm API error");
  }

  const topartists = data.topartists;
  const artists = (topartists?.artist || []).map((a, index) => ({
    name: a.name,
    mbid: a.mbid || "",
    imageUrl: "",
    rank: index + 1,
  }));

  const attr = topartists?.["@attr"];
  return {
    artists,
    pagination: {
      page: Number(attr?.page) || 1,
      totalPages: Number(attr?.totalPages) || 1,
    },
  };
};
