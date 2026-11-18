import { mbJson } from "./config";
import { mbCached, MB_TTL } from "./cache";
import type { MbPriority } from "./queue";
import type {
  MusicBrainzLabelInfo,
  MusicBrainzMedium,
  TrackMedia,
} from "./types";

export type LabelResult = { name: string; mbid: string } | null;

/** The parts of a release group's first release that pages read: its label and tracks. */
export type FirstRelease = {
  label: LabelResult;
  media: TrackMedia[];
};

type FirstReleaseResponse = {
  releases?: {
    media?: MusicBrainzMedium[];
    "label-info"?: MusicBrainzLabelInfo[];
  }[];
};

function toLabel(labelInfo: MusicBrainzLabelInfo[] | undefined): LabelResult {
  const label = labelInfo?.[0]?.label;
  if (!label?.name || !label?.id) return null;
  return { name: label.name, mbid: label.id };
}

function toMedia(media: MusicBrainzMedium[] | undefined): TrackMedia[] {
  return (media || []).map((m) => ({
    position: m.position,
    format: m.format || "",
    title: m.title || "",
    tracks: (m.tracks || []).map((t) => ({
      position: t.position,
      title: t.recording?.title || t.title,
      length: t.length,
    })),
  }));
}

async function loadFirstRelease(
  releaseGroupId: string,
  priority: MbPriority
): Promise<FirstRelease> {
  const path = `/release?release-group=${releaseGroupId}&inc=labels+recordings+media&limit=1&fmt=json`;
  const data = await mbJson<FirstReleaseResponse>(path, priority);
  const release = data?.releases?.[0];

  return {
    label: toLabel(release?.["label-info"]),
    media: toMedia(release?.media),
  };
}

/**
 * The label and the tracklist both come from the same first release. One
 * request with both `inc`s serves both, where two used to fetch the same
 * release twice.
 */
export function getFirstRelease(
  releaseGroupId: string,
  priority: MbPriority = "interactive"
): Promise<FirstRelease> {
  return mbCached(
    {
      key: `rg-first-release:${releaseGroupId}`,
      ttlSeconds: MB_TTL.immutable,
      priority,
    },
    (p) => loadFirstRelease(releaseGroupId, p)
  );
}
