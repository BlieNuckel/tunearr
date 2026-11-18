import { getConfigValue } from "../../config";
import {
  effectiveMbRequestsPerSecond,
  mbServerKind,
  resolveMbServerRoot,
  type MbServerKind,
  type MusicBrainzSettings,
} from "../../../shared/musicbrainzServer";

/** Everything a request needs to know about the server it is going to. */
export type MbServer = {
  /** Host root, also used to tell servers apart in cache keys and queue state. */
  root: string;
  /** Root plus `/ws/2`; request paths are appended to this. */
  baseUrl: string;
  kind: MbServerKind;
  /** Minimum gap between two grants. 0 means unpaced. */
  intervalMs: number;
};

/**
 * Added to every paced interval so timer jitter can't land two grants inside the
 * same second of the server's window.
 */
const INTERVAL_JITTER_MS = 100;

function intervalMsFor(requestsPerSecond: number): number {
  if (requestsPerSecond <= 0) return 0;
  return Math.ceil(1000 / requestsPerSecond) + INTERVAL_JITTER_MS;
}

/** Describe a server from its settings, without reading config. */
export function describeMbServer(settings: MusicBrainzSettings): MbServer {
  const root = resolveMbServerRoot(settings.serverUrl);
  return {
    root,
    baseUrl: `${root}/ws/2`,
    kind: mbServerKind(settings.serverUrl),
    intervalMs: intervalMsFor(effectiveMbRequestsPerSecond(settings)),
  };
}

/**
 * The server currently configured. Read on every call, like other service
 * configs, so a settings change applies without a restart.
 */
export function getMbServer(): MbServer {
  return describeMbServer(getConfigValue("musicbrainz"));
}
