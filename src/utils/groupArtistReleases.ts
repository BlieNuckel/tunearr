import type { ReleaseGroup } from "@/types";

export interface ReleaseSection {
  title: string;
  items: ReleaseGroup[];
}

type BucketKey = "albums" | "eps" | "singles" | "compilations" | "other";

const SECTION_ORDER: { key: BucketKey; title: string }[] = [
  { key: "albums", title: "Albums" },
  { key: "eps", title: "EPs" },
  { key: "singles", title: "Singles" },
  { key: "compilations", title: "Compilations & Live" },
  { key: "other", title: "Other releases" },
];

const SECONDARY_BUCKET = new Set([
  "compilation",
  "live",
  "soundtrack",
  "remix",
  "dj-mix",
  "mixtape/street",
  "demo",
]);

function hasBucketedSecondaryType(rg: ReleaseGroup): boolean {
  return (rg["secondary-types"] ?? []).some((t) =>
    SECONDARY_BUCKET.has(t.toLowerCase())
  );
}

function primaryBucket(rg: ReleaseGroup): BucketKey {
  switch ((rg["primary-type"] ?? "").toLowerCase()) {
    case "album":
      return "albums";
    case "ep":
      return "eps";
    case "single":
      return "singles";
    default:
      return "other";
  }
}

function byDateDesc(a: ReleaseGroup, b: ReleaseGroup): number {
  const dateA = a["first-release-date"] || "";
  const dateB = b["first-release-date"] || "";
  if (dateA && dateB) return dateB.localeCompare(dateA);
  if (dateA) return -1;
  if (dateB) return 1;
  return b.score - a.score;
}

/**
 * Organize an artist's release groups into MusicBrainz-style sections.
 * Releases where the artist isn't the primary credit are grouped under
 * "Featured"; the rest are bucketed by primary/secondary type.
 * @param releaseGroups Release groups returned for the artist
 * @param artistMbid The MBID of the artist whose page is being viewed
 */
export function groupArtistReleases(
  releaseGroups: ReleaseGroup[],
  artistMbid: string
): ReleaseSection[] {
  const buckets: Record<BucketKey, ReleaseGroup[]> = {
    albums: [],
    eps: [],
    singles: [],
    compilations: [],
    other: [],
  };
  const featured: ReleaseGroup[] = [];

  for (const rg of releaseGroups) {
    const credited = rg["artist-credit"]?.[0]?.artist?.id;
    if (credited && credited !== artistMbid) {
      featured.push(rg);
      continue;
    }
    const key = hasBucketedSecondaryType(rg)
      ? "compilations"
      : primaryBucket(rg);
    buckets[key].push(rg);
  }

  const sections: ReleaseSection[] = [];
  for (const { key, title } of SECTION_ORDER) {
    if (buckets[key].length > 0) {
      sections.push({ title, items: buckets[key].sort(byDateDesc) });
    }
  }
  if (featured.length > 0) {
    sections.push({ title: "Featured", items: featured.sort(byDateDesc) });
  }

  return sections;
}
