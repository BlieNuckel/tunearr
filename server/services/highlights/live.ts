import { listNoticeCandidates } from "../liveEvents/notice";
import type { NoticeCandidate } from "../liveEvents/notice";
import { serializeNotice } from "../liveEvents/serialize";
import { TIER_FRESH, TIER_STANDING, TIER_URGENT } from "./rank";
import type { HighlightTier, LiveHighlight, RankedHighlight } from "./types";

/**
 * A changed date is urgent wherever it is. A show close enough to go to on a
 * weeknight is as much news as a new album; one that needs travel ranks below.
 */
function tierFor(candidate: NoticeCandidate): HighlightTier {
  if (candidate.reason === "status-changed") return TIER_URGENT;
  return candidate.tier === "local" ? TIER_FRESH : TIER_STANDING;
}

/**
 * When the show became news. A show that is coming up soon is news right now,
 * however long ago it was announced.
 */
function newsAt(candidate: NoticeCandidate, nowIso: string): string {
  const { event } = candidate;
  if (candidate.reason === "status-changed") {
    return event.status_changed_at ?? nowIso;
  }
  if (candidate.reason === "just-announced") return event.first_seen_at;
  return nowIso;
}

export async function listLiveHighlights(
  userId: number,
  now: number
): Promise<RankedHighlight<LiveHighlight>[]> {
  const nowIso = new Date(now).toISOString();
  const candidates = await listNoticeCandidates(userId, now);
  return candidates.map((candidate) => ({
    tier: tierFor(candidate),
    at: newsAt(candidate, nowIso),
    highlight: {
      ...serializeNotice(candidate),
      kind: "live",
      key: `live:${candidate.event.id}`,
    },
  }));
}
