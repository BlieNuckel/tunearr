import { getFirstRelease } from "./firstRelease";
import type { MbPriority } from "./queue";
import type { TrackMedia } from "./types";

/** Fetch the track listing for a release group */
export async function getReleaseTracks(
  releaseGroupId: string,
  priority: MbPriority = "interactive"
): Promise<TrackMedia[]> {
  return (await getFirstRelease(releaseGroupId, priority)).media;
}
