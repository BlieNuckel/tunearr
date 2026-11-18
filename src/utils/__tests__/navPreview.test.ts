import {
  albumNavState,
  albumPreviewFromNewRelease,
  albumPreviewFromReleaseGroup,
  artistNavState,
  readAlbumPreview,
  readArtistPreview,
} from "../navPreview";
import type { NewReleaseItem, ReleaseGroup } from "@/types";

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

describe("albumPreviewFromNewRelease", () => {
  it("builds album details from a new-release item", () => {
    const item: NewReleaseItem = {
      releaseGroupMbid: "rg-2",
      title: "Kid A",
      artistName: "Radiohead",
      artistMbid: "a1",
      releaseDate: "2000-10-02",
      coverUrl: null,
      lidarrStatus: null,
      followedReleaseId: null,
    };
    expect(
      albumPreviewFromNewRelease({ ...item, releaseGroupMbid: "rg-2" })
    ).toEqual({
      mbid: "rg-2",
      title: "Kid A",
      artistName: "Radiohead",
      artistMbid: "a1",
      firstReleaseDate: "2000-10-02",
      primaryType: null,
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
