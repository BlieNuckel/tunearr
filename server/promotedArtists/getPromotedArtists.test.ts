import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PromotedAlbumConfig } from "../config";

const mockGetTopArtists = vi.fn();
const mockGetSimilarArtists = vi.fn();
const mockEnrichArtistsWithImages = vi.fn();
const mockLidarrGet = vi.fn();
const mockGetConfigValue = vi.fn();

vi.mock("../api/plex/topArtists", () => ({
  getTopArtists: (...args: unknown[]) => mockGetTopArtists(...args),
}));

vi.mock("../api/lastfm/artists", () => ({
  getSimilarArtists: (...args: unknown[]) => mockGetSimilarArtists(...args),
}));

vi.mock("../services/lastfm", () => ({
  enrichArtistsWithImages: (...args: unknown[]) =>
    mockEnrichArtistsWithImages(...args),
}));

vi.mock("../api/lidarr/get", () => ({
  lidarrGet: (...args: unknown[]) => mockLidarrGet(...args),
}));

vi.mock("../config", () => ({
  getConfigValue: (...args: unknown[]) => mockGetConfigValue(...args),
}));

import {
  getPromotedArtists,
  clearPromotedArtistsCache,
} from "./getPromotedArtists";

type SimilarArtist = {
  name: string;
  mbid: string;
  match: number;
  imageUrl: string;
};

const baseConfig: PromotedAlbumConfig = {
  cacheDurationMinutes: 30,
  topArtistsRange: "6months",
  topArtistsCount: 10,
  pickedArtistsCount: 2,
  tagsPerArtist: 3,
  deepPageMin: 2,
  deepPageMax: 10,
  genericTags: [],
  libraryPreference: "prefer_new",
  explorationRate: 0,
  exploreCandidateCount: 12,
  genreOverlapThreshold: 0.15,
};

const TOP_ARTISTS = [
  { name: "Aphex Twin", viewCount: 100, thumb: "", genres: [] },
  { name: "Plaid", viewCount: 50, thumb: "", genres: [] },
  { name: "Autechre", viewCount: 25, thumb: "", genres: [] },
];

const SIMILAR: Record<string, SimilarArtist[]> = {
  "Aphex Twin": [
    { name: "Boards of Canada", mbid: "boc", match: 0.9, imageUrl: "" },
    { name: "Plaid", mbid: "pl", match: 0.8, imageUrl: "" },
  ],
  Plaid: [
    { name: "Boards of Canada", mbid: "boc", match: 0.95, imageUrl: "" },
    { name: "Tycho", mbid: "ty", match: 0.7, imageUrl: "" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  clearPromotedArtistsCache();
  vi.spyOn(Math, "random").mockReturnValue(0);

  mockGetConfigValue.mockReturnValue(baseConfig);
  mockGetTopArtists.mockResolvedValue(TOP_ARTISTS);
  mockGetSimilarArtists.mockImplementation((name: string) =>
    Promise.resolve(SIMILAR[name] ?? [])
  );
  mockEnrichArtistsWithImages.mockImplementation((artists: unknown) =>
    Promise.resolve(artists)
  );
  mockLidarrGet.mockResolvedValue({
    ok: true,
    data: [{ artistName: "Tycho", foreignArtistId: "ty" }],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getPromotedArtists", () => {
  it("returns null when the user has no top artists", async () => {
    mockGetTopArtists.mockResolvedValue([]);
    expect(await getPromotedArtists("token")).toBeNull();
  });

  it("uses the listening window config to fetch top artists", async () => {
    await getPromotedArtists("token");
    expect(mockGetTopArtists).toHaveBeenCalledWith("token", 10, "6months");
  });

  it("returns similar artists seeded from the top artists", async () => {
    const result = await getPromotedArtists("token");
    expect(result).not.toBeNull();
    expect(result!.seedArtists).toEqual(["Aphex Twin", "Plaid"]);
    const names = result!.artists.map((a) => a.name).sort();
    expect(names).toEqual(["Boards of Canada", "Tycho"]);
  });

  it("excludes artists already in the user's top list", async () => {
    const result = await getPromotedArtists("token");
    const names = result!.artists.map((a) => a.name);
    expect(names).not.toContain("Plaid");
  });

  it("dedupes by name and keeps the highest match", async () => {
    const result = await getPromotedArtists("token");
    const boc = result!.artists.find((a) => a.name === "Boards of Canada");
    expect(boc?.match).toBe(0.95);
  });

  it("marks artists in the library", async () => {
    const result = await getPromotedArtists("token");
    const tycho = result!.artists.find((a) => a.name === "Tycho");
    const boc = result!.artists.find((a) => a.name === "Boards of Canada");
    expect(tycho?.inLibrary).toBe(true);
    expect(boc?.inLibrary).toBe(false);
  });

  it("returns null when no similar artists remain after exclusion", async () => {
    mockGetSimilarArtists.mockResolvedValue([
      { name: "Aphex Twin", mbid: "at", match: 0.9, imageUrl: "" },
    ]);
    expect(await getPromotedArtists("token")).toBeNull();
  });

  it("caches results per user and recomputes on refresh", async () => {
    await getPromotedArtists("token");
    await getPromotedArtists("token");
    expect(mockGetTopArtists).toHaveBeenCalledTimes(1);

    await getPromotedArtists("token", true);
    expect(mockGetTopArtists).toHaveBeenCalledTimes(2);
  });

  it("survives Lidarr being unavailable", async () => {
    mockLidarrGet.mockRejectedValue(new Error("down"));
    const result = await getPromotedArtists("token");
    expect(result).not.toBeNull();
    expect(result!.artists.every((a) => a.inLibrary === false)).toBe(true);
  });
});
