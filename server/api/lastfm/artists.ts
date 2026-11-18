import { resilientFetch } from "../resilientFetch";
import { buildUrl } from "./config";
import type { LastfmSimilarResponse } from "./types";

export const getSimilarArtists = async (artist: string) => {
  const url = buildUrl("artist.getSimilar", { artist, limit: "30" });
  const response = await resilientFetch(url);
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
