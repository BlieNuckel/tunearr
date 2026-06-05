import { describe, it, expect, vi, beforeEach } from "vitest";

const mockResilientFetch = vi.fn();

vi.mock("../resilientFetch", () => ({
  resilientFetch: (...args: unknown[]) => mockResilientFetch(...args),
}));

import { getSimilarArtists } from "./similarArtists";

const sampleResponse = [
  {
    artist_mbid: "mbid-nirvana",
    name: "Nirvana",
    comment: "grunge band",
    type: "Group",
    gender: null,
    score: 9000,
    reference_mbid: "mbid-seed",
  },
  {
    artist_mbid: "mbid-muse",
    name: "Muse",
    comment: "",
    type: "Group",
    gender: null,
    score: 11000,
    reference_mbid: "mbid-seed",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSimilarArtists", () => {
  it("returns artists sorted by descending score", async () => {
    mockResilientFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleResponse),
    });

    const result = await getSimilarArtists("mbid-seed");
    expect(result.map((a) => a.name)).toEqual(["Muse", "Nirvana"]);
  });

  it("passes the artist mbid and algorithm in the query", async () => {
    mockResilientFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await getSimilarArtists("mbid-seed", "custom_algo");
    const url = mockResilientFetch.mock.calls[0][0] as string;
    expect(url).toContain("artist_mbids=mbid-seed");
    expect(url).toContain("algorithm=custom_algo");
  });

  it("filters out the seed artist and unnamed entries", async () => {
    mockResilientFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { ...sampleResponse[0], artist_mbid: "mbid-seed" },
          { ...sampleResponse[1], name: "" },
          sampleResponse[0],
        ]),
    });

    const result = await getSimilarArtists("mbid-seed");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Nirvana");
  });

  it("returns [] on a non-ok response", async () => {
    mockResilientFetch.mockResolvedValue({ ok: false, json: () => {} });
    expect(await getSimilarArtists("mbid-seed")).toEqual([]);
  });

  it("returns [] when the response is not an array", async () => {
    mockResilientFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: "nope" }),
    });
    expect(await getSimilarArtists("mbid-seed")).toEqual([]);
  });

  it("returns [] when the fetch throws", async () => {
    mockResilientFetch.mockRejectedValue(new Error("network"));
    expect(await getSimilarArtists("mbid-seed")).toEqual([]);
  });
});
