import {
  albumNavState,
  albumPreviewFromReleaseHighlight,
  albumPreviewFromRequestHighlight,
  albumPreviewFromReleaseGroup,
  artistNavState,
  readAlbumPreview,
  readArtistPreview,
} from "../navPreview";
import type { ReleaseHighlight, ReleaseGroup } from "@/types";

const rg: ReleaseGroup = {
  id: "rg-1",
  score: 100,
  title: "OK Computer",
  "primary-type": "Album",
  "first-release-date": "1997-05-21",
  "artist-credit": [
    { name: "Radiohead", artist: { id: "a1", name: "Radiohead" } },
  ],
};

describe("albumPreviewFromReleaseGroup", () => {
  it("carries what a card shows into album details", () => {
    expect(albumPreviewFromReleaseGroup(rg)).toEqual({
      mbid: "rg-1",
      title: "OK Computer",
      artistName: "Radiohead",
      artistMbid: "a1",
      firstReleaseDate: "1997-05-21",
      primaryType: "Album",
      secondaryTypes: [],
    });
  });

  it("copes with a card without an artist credit", () => {
    expect(
      albumPreviewFromReleaseGroup({ ...rg, "artist-credit": [] })
    ).toMatchObject({ artistName: "Unknown Artist", artistMbid: null });
  });
});

describe("albumPreviewFromRequestHighlight", () => {
  it("builds album details from an arrived request", () => {
    expect(
      albumPreviewFromRequestHighlight({
        kind: "request",
        key: "request:9",
        requestId: 9,
        albumMbid: "rg-9",
        title: "Dummy",
        artistName: "Portishead",
        coverUrl: "https://caa.test/rg-9.jpg",
        availableAt: "2026-11-18T09:00:00.000Z",
      })
    ).toEqual({
      mbid: "rg-9",
      title: "Dummy",
      artistName: "Portishead",
      artistMbid: null,
      firstReleaseDate: null,
      primaryType: null,
      secondaryTypes: [],
    });
  });
});

describe("albumPreviewFromReleaseHighlight", () => {
  it("builds album details from a release highlight", () => {
    const item: ReleaseHighlight = {
      kind: "release",
      key: "release:1",
      followedReleaseId: 1,
      releaseGroupMbid: "rg-2",
      title: "Kid A",
      artistName: "Radiohead",
      artistMbid: "a1",
      releaseDate: "2000-10-02",
      releaseType: "Album",
      coverUrl: null,
      lidarrStatus: null,
      unseen: true,
    };
    expect(
      albumPreviewFromReleaseHighlight({ ...item, releaseGroupMbid: "rg-2" })
    ).toEqual({
      mbid: "rg-2",
      title: "Kid A",
      artistName: "Radiohead",
      artistMbid: "a1",
      firstReleaseDate: "2000-10-02",
      primaryType: "Album",
      secondaryTypes: [],
    });
  });
});

describe("reading previews", () => {
  it("returns the album preview for the album it names", () => {
    const state = albumNavState(albumPreviewFromReleaseGroup(rg));
    expect(readAlbumPreview(state, "rg-1")?.title).toBe("OK Computer");
  });

  it("ignores a preview for another album, or no state at all", () => {
    const state = albumNavState(albumPreviewFromReleaseGroup(rg));
    expect(readAlbumPreview(state, "rg-other")).toBeNull();
    expect(readAlbumPreview(null, "rg-1")).toBeNull();
    expect(readAlbumPreview(undefined, undefined)).toBeNull();
  });

  it("returns the artist preview for the artist it names", () => {
    const state = artistNavState({ mbid: "a1", name: "Radiohead" });
    expect(readArtistPreview(state, "a1")).toEqual({
      mbid: "a1",
      name: "Radiohead",
    });
    expect(readArtistPreview(state, "a2")).toBeNull();
  });
});
