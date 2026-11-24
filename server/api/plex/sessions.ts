import { resilientFetch } from "../resilientFetch";
import { getPlexConfig } from "./config";
import type { PlexSessionMetadata, PlexSessionsResponse } from "./types";

/** One track currently loaded on a client, as `/status/sessions` reports it. */
export type PlexTrackSession = {
  sessionKey: string;
  ratingKey: string;
  title: string;
  artistKey: string;
  artistName: string;
  albumKey: string;
  albumTitle: string;
  durationMs: number;
  /** Playback position in milliseconds — the only trustworthy evidence that audio moved. */
  viewOffsetMs: number;
  machineIdentifier: string;
  product: string;
  /** Plex's own claim about playback, kept for diagnostics; it is not always right. */
  state: string;
  /**
   * The server's id for the listening account: the plex.tv account id, except for the
   * server owner, whom the server always reports as `1`.
   */
  accountId: string;
};

const isTrack = (raw: PlexSessionMetadata): boolean =>
  raw.type === "track" &&
  Boolean(raw.sessionKey) &&
  Boolean(raw.ratingKey) &&
  typeof raw.viewOffset === "number";

const mapSession = (raw: PlexSessionMetadata): PlexTrackSession => ({
  sessionKey: raw.sessionKey ?? "",
  ratingKey: raw.ratingKey ?? "",
  title: raw.title ?? "",
  artistKey: raw.grandparentRatingKey ?? "",
  artistName: raw.grandparentTitle ?? "",
  albumKey: raw.parentRatingKey ?? "",
  albumTitle: raw.parentTitle ?? "",
  durationMs: raw.duration ?? 0,
  viewOffsetMs: raw.viewOffset ?? 0,
  machineIdentifier: raw.Player?.machineIdentifier ?? "",
  product: raw.Player?.product ?? "",
  state: raw.Player?.state ?? "",
  accountId: String(raw.User?.id ?? raw.Player?.userID ?? ""),
});

/**
 * Every music track currently loaded on any client of the server, across all accounts.
 *
 * Only the server owner may read this; any other account's token gets a 401. Cached or
 * offline Plexamp playback produces no session at all while still committing a play later,
 * so an empty read is not evidence of no listening.
 */
export async function getActiveSessions(
  ownerToken: string
): Promise<PlexTrackSession[]> {
  const { baseUrl, headers } = getPlexConfig(ownerToken);
  const res = await resilientFetch(`${baseUrl}/status/sessions`, { headers });
  if (!res.ok) throw new Error(`Plex returned ${res.status}`);

  const data: PlexSessionsResponse = await res.json();
  return (data.MediaContainer?.Metadata ?? []).filter(isTrack).map(mapSession);
}
