/**
 * Which MusicBrainz server Tunearr reads from, and how fast it may ask. Shared so
 * the settings form and the server agree on what a URL means and what pace it
 * allows.
 */

export type MusicBrainzSettings = {
  /** Host root of the server, without `/ws/2`. Blank means the public musicbrainz.org. */
  serverUrl: string;
  /** Requests per second. 0 means unpaced, which only a non-public server may use. */
  requestsPerSecond: number;
};

/** Public servers are run by MetaBrainz, and their documented rule is what decides refusal handling. */
export type MbServerKind = "official" | "custom";

export const OFFICIAL_MB_ROOT = "https://musicbrainz.org";

/** MusicBrainz's documented limit for its public servers. Not ours to raise. */
export const PUBLIC_MB_MAX_RPS = 1;

/** Upper bound for a custom server, so a typo can't turn the queue into a flood. */
export const CUSTOM_MB_MAX_RPS = 100;

export const DEFAULT_MUSICBRAINZ: MusicBrainzSettings = {
  serverUrl: "",
  requestsPerSecond: PUBLIC_MB_MAX_RPS,
};

/**
 * Trim, drop trailing slashes and a pasted `/ws/2`, since `/ws/2` is appended to
 * every request.
 */
export function normalizeMbServerUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/ws\/2$/i, "")
    .replace(/\/+$/, "");
}

/** Why a server URL can't be used, or null when it can. Blank is valid. */
export function mbServerUrlError(raw: string): string | null {
  const url = normalizeMbServerUrl(raw);
  if (url === "") return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Enter a full URL, e.g. http://musicbrainz.local:5000";
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "The URL must start with http:// or https://";
  }

  return null;
}

/** The host root requests go to: the configured one, or the public server when blank. */
export function resolveMbServerRoot(serverUrl: string): string {
  return normalizeMbServerUrl(serverUrl) || OFFICIAL_MB_ROOT;
}

/** True for musicbrainz.org and its subdomains, which all share the public limit. */
export function isPublicMbHost(serverUrl: string): boolean {
  try {
    const host = new URL(resolveMbServerRoot(serverUrl)).hostname.toLowerCase();
    return host === "musicbrainz.org" || host.endsWith(".musicbrainz.org");
  } catch {
    return false;
  }
}

export function mbServerKind(serverUrl: string): MbServerKind {
  return isPublicMbHost(serverUrl) ? "official" : "custom";
}

/** Highest pace the server accepts from us. */
export function maxMbRequestsPerSecond(serverUrl: string): number {
  return isPublicMbHost(serverUrl) ? PUBLIC_MB_MAX_RPS : CUSTOM_MB_MAX_RPS;
}

/**
 * The pace actually used. A public host is held to its limit whatever was saved,
 * and can't be unpaced, so a value saved for a mirror never leaks onto it.
 */
export function effectiveMbRequestsPerSecond(
  settings: MusicBrainzSettings
): number {
  if (!isPublicMbHost(settings.serverUrl)) {
    return Math.min(Math.max(settings.requestsPerSecond, 0), CUSTOM_MB_MAX_RPS);
  }
  if (settings.requestsPerSecond <= 0) return PUBLIC_MB_MAX_RPS;
  return Math.min(settings.requestsPerSecond, PUBLIC_MB_MAX_RPS);
}

/**
 * Why a pace can't be saved, or null when it can. A public host is not rejected
 * for a higher pace: switching back from a mirror must not fail the save, and
 * `effectiveMbRequestsPerSecond` holds it to the limit anyway.
 */
export function mbRequestsPerSecondError(rps: unknown): string | null {
  if (typeof rps !== "number" || !Number.isFinite(rps) || rps < 0) {
    return "Requests per second must be 0 or more";
  }
  if (rps > CUSTOM_MB_MAX_RPS) {
    return `Requests per second can be at most ${CUSTOM_MB_MAX_RPS}`;
  }
  return null;
}
