import { getLidarrConfig } from "./config";
import { lidarrFetch } from "./fetch";
import { parseResponseJson } from "./parseResponseJson";
import { ProxyResponse } from "./types";

/** Generic proxy helper for POST requests */
const lidarrPost = async <T = unknown>(
  lidarrPath: string,
  body: unknown
): Promise<ProxyResponse<T>> => {
  const { url, headers } = getLidarrConfig();
  const response = await lidarrFetch(`${url}/api/v1${lidarrPath}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    data: await parseResponseJson<T>(response),
    ok: response.ok,
  };
};

export { lidarrPost };
