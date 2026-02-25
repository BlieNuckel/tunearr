import { resilientFetch } from "../resilientFetch";
import { MB_BASE, MB_HEADERS } from "./config";
import type { MusicBrainzReleasesResponse, TrackMedia } from "./types";

/** Fetch the track listing for a release group */
export async function getReleaseTracks(
  releaseGroupId: string
): Promise<TrackMedia[]> {
  const url = `${MB_BASE}/release?release-group=${releaseGroupId}&inc=recordings+media&limit=1&fmt=json`;
  const response = await resilientFetch(url, { headers: MB_HEADERS });

  if (!response.ok) {
    throw new Error(`MusicBrainz returned ${response.status}`);
  }

  const data: MusicBrainzReleasesResponse = await response.json();
  const release = data.releases?.[0];

  if (!release) {
    return [];
  }

  return (release.media || []).map((m) => ({
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
