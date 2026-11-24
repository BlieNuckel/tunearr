import { resilientFetch } from "../resilientFetch";
import { getPlexConfig } from "./config";
import { getMusicSectionKeys } from "./sections";
import type { PlexHistoryMetadata, PlexHistoryResponse } from "./types";

/** One committed play, as Plex's own event log records it. */
export type PlexHistoryEntry = {
  ratingKey: string;
  title: string;
  artistKey: string;
  artistName: string;
  albumKey: string;
  albumTitle: string;
  /** Unix **seconds**, as Plex reports it. */
  viewedAt: number;
  deviceID?: number;
  accountID?: number;
};

const PAGE_SIZE = 1000;

/** Where one page of one account's history in one section is read from. */
type PageQuery = {
  sectionKey: string;
  accountId: string;
  sinceSeconds: number;
  start: number;
};

const buildPageUrl = (
  baseUrl: string,
  { sectionKey, accountId, sinceSeconds, start }: PageQuery
): string =>
  `${baseUrl}/status/sessions/history/all?librarySectionID=${sectionKey}` +
  `&accountID=${encodeURIComponent(accountId)}` +
  `&viewedAt%3E=${sinceSeconds}&sort=viewedAt:asc` +
  `&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${PAGE_SIZE}`;

/**
 * The numeric id at the end of a `/library/metadata/1234` path. History rows carry the
 * parent and grandparent as paths; some PMS versions also send the plain rating keys, so
 * this is only the fallback.
 */
const keyFromPath = (path?: string): string =>
  path ? (path.split("/").pop() ?? "") : "";

const mapEntry = (raw: PlexHistoryMetadata): PlexHistoryEntry => ({
  ratingKey: raw.ratingKey ?? "",
  title: raw.title ?? "",
  artistKey: raw.grandparentRatingKey ?? keyFromPath(raw.grandparentKey),
  artistName: raw.grandparentTitle ?? "",
  albumKey: raw.parentRatingKey ?? keyFromPath(raw.parentKey),
  albumTitle: raw.parentTitle ?? "",
  viewedAt: raw.viewedAt,
  deviceID: raw.deviceID,
  accountID: raw.accountID,
});

const isUsable = (raw: PlexHistoryMetadata): boolean =>
  Boolean(raw.ratingKey) &&
  typeof raw.viewedAt === "number" &&
  Boolean(raw.grandparentTitle || raw.grandparentRatingKey);

async function fetchPage(
  baseUrl: string,
  headers: Record<string, string>,
  query: PageQuery
): Promise<{ items: PlexHistoryEntry[]; rowCount: number; totalSize: number }> {
  const res = await resilientFetch(buildPageUrl(baseUrl, query), { headers });
  if (!res.ok) throw new Error(`Plex returned ${res.status}`);

  const data: PlexHistoryResponse = await res.json();
  const container = data.MediaContainer;
  const metadata = container?.Metadata ?? [];

  return {
    items: metadata.filter(isUsable).map(mapEntry),
    rowCount: metadata.length,
    totalSize: container?.totalSize ?? metadata.length,
  };
}

/**
 * One account's play history in one music section from `sinceSeconds` onwards, paged to
 * completion. Sorted ascending so paging stays stable while the log grows underneath us — a
 * new play lands at the end rather than shifting every row we have not read yet.
 */
async function walkSection(
  baseUrl: string,
  headers: Record<string, string>,
  query: Omit<PageQuery, "start">
): Promise<PlexHistoryEntry[]> {
  const all: PlexHistoryEntry[] = [];
  let start = 0;
  for (;;) {
    const page = await fetchPage(baseUrl, headers, { ...query, start });
    all.push(...page.items);
    start += PAGE_SIZE;
    if (page.rowCount < PAGE_SIZE || start >= page.totalSize) break;
  }
  return all;
}

/**
 * One account's committed plays across every music section since `sinceSeconds` (Unix
 * seconds; `0` reads the whole log). Plex's event log is the only source with a real
 * timestamp per play and it survives Plexamp replaying plays it cached while offline, which
 * is why it is the spine the other listening sources join onto.
 *
 * `accountId` is the server's id for the account (`1` for the owner). The owner's token reads
 * every account's plays, so the filter is what keeps one user's history from absorbing
 * everyone else's; rows that still name another account are dropped. Sections are walked
 * sequentially so a server with several music libraries doesn't get several concurrent full
 * sweeps.
 */
export async function getPlayHistory(
  serverToken: string,
  accountId: string,
  sinceSeconds = 0
): Promise<PlexHistoryEntry[]> {
  const { baseUrl, headers } = getPlexConfig(serverToken);
  const sectionKeys = await getMusicSectionKeys(baseUrl, headers);

  const all: PlexHistoryEntry[] = [];
  for (const sectionKey of sectionKeys) {
    all.push(
      ...(await walkSection(baseUrl, headers, {
        sectionKey,
        accountId,
        sinceSeconds,
      }))
    );
  }
  return all
    .filter(
      (entry) =>
        entry.accountID === undefined || String(entry.accountID) === accountId
    )
    .sort((a, b) => a.viewedAt - b.viewedAt);
}
