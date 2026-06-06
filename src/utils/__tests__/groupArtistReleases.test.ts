import { describe, it, expect } from "vitest";
import { groupArtistReleases } from "../groupArtistReleases";
import type { ReleaseGroup } from "@/types";

const ARTIST = "artist-1";

const make = (overrides: Partial<ReleaseGroup>): ReleaseGroup => ({
  id: "rg",
  score: 100,
  title: "Title",
  "primary-type": "Album",
  "first-release-date": "2020-01-01",
  "artist-credit": [{ name: "Artist", artist: { id: ARTIST, name: "Artist" } }],
  ...overrides,
});

describe("groupArtistReleases", () => {
  it("buckets release groups by primary type", () => {
    const sections = groupArtistReleases(
      [
        make({ id: "a", "primary-type": "Album" }),
        make({ id: "e", "primary-type": "EP" }),
        make({ id: "s", "primary-type": "Single" }),
      ],
      ARTIST
    );

    expect(sections.map((s) => s.title)).toEqual(["Albums", "EPs", "Singles"]);
  });

  it("groups releases with bucketed secondary types under Compilations & Live", () => {
    const sections = groupArtistReleases(
      [
        make({ id: "live", "secondary-types": ["Live"] }),
        make({ id: "comp", "secondary-types": ["Compilation"] }),
        make({ id: "studio" }),
      ],
      ARTIST
    );

    const titles = sections.map((s) => s.title);
    expect(titles).toContain("Compilations & Live");
    const comp = sections.find((s) => s.title === "Compilations & Live")!;
    expect(comp.items.map((i) => i.id).sort()).toEqual(["comp", "live"]);
    expect(sections.find((s) => s.title === "Albums")!.items).toHaveLength(1);
  });

  it("separates releases where the artist is not the primary credit into Featured", () => {
    const sections = groupArtistReleases(
      [
        make({ id: "own" }),
        make({
          id: "guest",
          "artist-credit": [
            { name: "Other", artist: { id: "other", name: "Other" } },
          ],
        }),
      ],
      ARTIST
    );

    expect(sections.find((s) => s.title === "Featured")!.items[0].id).toBe(
      "guest"
    );
    expect(sections.find((s) => s.title === "Albums")!.items[0].id).toBe("own");
  });

  it("orders sections Albums, EPs, Singles, Compilations & Live, Featured", () => {
    const sections = groupArtistReleases(
      [
        make({
          id: "f",
          "artist-credit": [
            { name: "Other", artist: { id: "other", name: "Other" } },
          ],
        }),
        make({ id: "c", "secondary-types": ["Live"] }),
        make({ id: "s", "primary-type": "Single" }),
        make({ id: "e", "primary-type": "EP" }),
        make({ id: "a", "primary-type": "Album" }),
      ],
      ARTIST
    );

    expect(sections.map((s) => s.title)).toEqual([
      "Albums",
      "EPs",
      "Singles",
      "Compilations & Live",
      "Featured",
    ]);
  });

  it("sorts items within a section by release date descending", () => {
    const sections = groupArtistReleases(
      [
        make({ id: "old", "first-release-date": "2000-01-01" }),
        make({ id: "new", "first-release-date": "2022-01-01" }),
        make({ id: "mid", "first-release-date": "2010-01-01" }),
      ],
      ARTIST
    );

    expect(sections[0].items.map((i) => i.id)).toEqual(["new", "mid", "old"]);
  });

  it("omits empty sections", () => {
    const sections = groupArtistReleases([make({ id: "a" })], ARTIST);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe("Albums");
  });
});
