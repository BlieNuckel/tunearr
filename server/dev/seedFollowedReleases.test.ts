import { describe, it, expect } from "vitest";
import { SEED_FOLLOWED_RELEASES, seedReleaseRow } from "./seedFollowedReleases";
import { SEED_FOLLOWED_ARTISTS } from "./seedLiveEvents";
import { RELEASE_HIGHLIGHT_DAYS } from "../services/highlights/releases";

const NOW = Date.parse("2026-11-18T12:00:00.000Z");
const FOLLOWED_MBIDS = new Set(SEED_FOLLOWED_ARTISTS.map((a) => a.mbid));

function find(
  predicate: (r: (typeof SEED_FOLLOWED_RELEASES)[number]) => boolean
) {
  return SEED_FOLLOWED_RELEASES.filter(predicate);
}

const inWindow = (r: (typeof SEED_FOLLOWED_RELEASES)[number]) =>
  r.releasedDaysAgo <= RELEASE_HIGHLIGHT_DAYS;

describe("seed followed releases shape", () => {
  it("uses unique release keys", () => {
    const keys = SEED_FOLLOWED_RELEASES.map((r) => r.releaseKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("only seeds releases for artists the seed follows", () => {
    for (const release of SEED_FOLLOWED_RELEASES) {
      expect(FOLLOWED_MBIDS.has(release.artistMbid)).toBe(true);
    }
  });

  it("uses real MusicBrainz ids so album pages resolve", () => {
    for (const release of find((r) => r.releaseGroupMbid !== null)) {
      expect(release.releaseGroupMbid).toMatch(/^[0-9a-f-]{36}$/);
    }
  });
});

describe("state coverage", () => {
  it("fills the featured card and the three beside it with visible releases", () => {
    expect(
      find((r) => inWindow(r) && !r.dismissed).length
    ).toBeGreaterThanOrEqual(4);
  });

  it("covers an unseen and an already opened release", () => {
    expect(
      find((r) => inWindow(r) && !r.viewed && !r.dismissed)
    ).not.toHaveLength(0);
    expect(find((r) => inWindow(r) && r.viewed)).not.toHaveLength(0);
  });

  it("covers a release without a MusicBrainz match", () => {
    expect(find((r) => r.releaseGroupMbid === null)).not.toHaveLength(0);
  });

  it("covers a dismissed release and one that aged out", () => {
    expect(find((r) => inWindow(r) && r.dismissed)).not.toHaveLength(0);
    expect(find((r) => !inWindow(r))).not.toHaveLength(0);
  });
});

describe("seedReleaseRow", () => {
  const [first] = SEED_FOLLOWED_RELEASES;

  it("dates the release relative to the run", () => {
    const row = seedReleaseRow({ ...first, releasedDaysAgo: 3 }, 7, NOW);

    expect(row.followed_artist_id).toBe(7);
    expect(row.release_date).toBe("2026-11-15");
  });

  it("points the cover at the Cover Art Archive", () => {
    const row = seedReleaseRow({ ...first, releaseGroupMbid: "rg-1" }, 7, NOW);
    expect(row.cover_url).toBe(
      "https://coverartarchive.org/release-group/rg-1/front-500"
    );
  });

  it("leaves the cover empty without a release group", () => {
    const row = seedReleaseRow({ ...first, releaseGroupMbid: null }, 7, NOW);
    expect(row.cover_url).toBeNull();
  });

  it("resets read state to what the seed asks for", () => {
    const fresh = seedReleaseRow(
      { ...first, viewed: false, dismissed: false },
      7,
      NOW
    );
    expect(fresh.viewed_at).toBeNull();
    expect(fresh.dismissed_at).toBeNull();

    const handled = seedReleaseRow(
      { ...first, viewed: true, dismissed: true },
      7,
      NOW
    );
    expect(handled.viewed_at).toBe(new Date(NOW).toISOString());
    expect(handled.dismissed_at).toBe(new Date(NOW).toISOString());
  });
});
