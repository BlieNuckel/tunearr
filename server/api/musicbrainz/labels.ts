import { MB_BASE, MB_HEADERS, rateLimitedMbFetch } from "./config";
import type { MusicBrainzLabelWithRels } from "./types";

type LabelInfo = { name: string; mbid: string };

const MAX_ANCESTOR_DEPTH = 5;

function extractParents(data: MusicBrainzLabelWithRels): LabelInfo[] {
  return (
    data.relations
      ?.filter(
        (r) =>
          r.type === "label ownership" && r.direction === "backward" && !r.ended
      )
      .map((r) => ({ name: r.label.name, mbid: r.label.id })) ?? []
  );
}

async function fetchLabelWithRels(
  labelMbid: string
): Promise<MusicBrainzLabelWithRels | null> {
  const url = `${MB_BASE}/label/${labelMbid}?inc=label-rels&fmt=json`;
  const response = await rateLimitedMbFetch(url, { headers: MB_HEADERS });
  if (!response.ok) return null;
  return response.json();
}

/** BFS walk up ownership chains, returning all ancestors nearest-first */
export async function getLabelAncestors(
  labelMbid: string,
  onAncestorFound?: (label: LabelInfo) => void
): Promise<LabelInfo[]> {
  const ancestors: LabelInfo[] = [];
  const visited = new Set<string>([labelMbid]);
  let queue = [labelMbid];

  for (let depth = 0; depth < MAX_ANCESTOR_DEPTH && queue.length > 0; depth++) {
    const nextQueue: string[] = [];

    for (const mbid of queue) {
      const data = await fetchLabelWithRels(mbid);
      if (!data) continue;

      for (const parent of extractParents(data)) {
        if (visited.has(parent.mbid)) continue;
        visited.add(parent.mbid);
        ancestors.push(parent);
        onAncestorFound?.(parent);
        nextQueue.push(parent.mbid);
      }
    }

    queue = nextQueue;
  }

  return ancestors;
}
