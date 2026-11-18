import { mbFetch } from "./config";
import { describeMbServer } from "./server";
import { createLogger } from "../../logger";
import type { MusicBrainzSettings } from "../../../shared/musicbrainzServer";

export type MbTestSuccess = {
  success: true;
  serverUrl: string;
  latencyMs: number;
};

export type MbTestError = {
  error: string;
  status: number;
};

/** An artist every MusicBrainz copy has; any mirror that can't find it is broken. */
const KNOWN_ARTIST_MBID = "a74b1b7f-71a5-4011-9441-d0b5e4122711";

const log = createLogger("musicbrainz-test-connection");

/**
 * Fetch a known artist through the given server at its pace. It takes a slot
 * from the shared queue like any other request, so testing can't burst a server.
 */
export async function testMbConnection(
  settings: MusicBrainzSettings
): Promise<MbTestSuccess | MbTestError> {
  const server = describeMbServer(settings);
  const started = Date.now();

  let response: Response;
  try {
    response = await mbFetch(
      `/artist/${KNOWN_ARTIST_MBID}?fmt=json`,
      "interactive",
      server
    );
  } catch (err) {
    log.warn(`MusicBrainz connection test to ${server.root} failed: ${err}`);
    return {
      error: err instanceof Error ? err.message : "Could not reach the server",
      status: 502,
    };
  }

  if (!response.ok) {
    return {
      error: `${server.root} returned ${response.status}`,
      status: 502,
    };
  }

  const data = (await response.json()) as { id?: string };
  if (data?.id !== KNOWN_ARTIST_MBID) {
    return {
      error: `${server.root} answered, but not with MusicBrainz data`,
      status: 502,
    };
  }

  return {
    success: true,
    serverUrl: server.root,
    latencyMs: Date.now() - started,
  };
}
