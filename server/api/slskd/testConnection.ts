import type { SlskdApplicationState } from "./types";
import { resilientFetch } from "../resilientFetch";
import { createLogger } from "../../logger";

const log = createLogger("slskd-test-connection");

export type SlskdTestSuccess = {
  success: true;
  version: string | null;
  soulseekConnected: boolean;
};

export type SlskdTestError = {
  error: string;
  status: number;
};

/**
 * @param {SlskdApplicationState["version"]} version
 * @returns {string | null}
 */
function parseVersion(
  version: SlskdApplicationState["version"]
): string | null {
  if (typeof version === "string") return version || null;
  return version?.full ?? version?.current ?? null;
}

/**
 * @param {SlskdApplicationState["server"]} server
 * @returns {boolean}
 */
function parseSoulseekConnected(
  server: SlskdApplicationState["server"]
): boolean {
  if (typeof server?.isLoggedIn === "boolean") return server.isLoggedIn;
  if (typeof server?.state === "string")
    return server.state.includes("LoggedIn");
  return false;
}

export async function testSlskdConnection(
  slskdUrl: string,
  slskdApiKey: string
): Promise<SlskdTestSuccess | SlskdTestError> {
  const url = slskdUrl.replace(/\/+$/, "");
  const headers = { "X-API-Key": slskdApiKey };

  let response: Response;
  try {
    response = await resilientFetch(
      `${url}/api/v0/application`,
      { headers },
      { retry: false }
    );
  } catch (err) {
    log.warn(`slskd connection failed: ${err}`);
    return {
      error: err instanceof Error ? err.message : "Could not reach slskd",
      status: 502,
    };
  }

  if (!response.ok) {
    return {
      error: `slskd returned ${response.status}`,
      status: response.status,
    };
  }

  const data = (await response.json()) as SlskdApplicationState;

  return {
    success: true,
    version: parseVersion(data.version),
    soulseekConnected: parseSoulseekConnected(data.server),
  };
}
