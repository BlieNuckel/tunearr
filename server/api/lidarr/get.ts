import { getLidarrConfig } from "./config";
import { lidarrFetch } from "./fetch";
import { ProxyResponse } from "./types";

/** Generic proxy helper for GET requests */
const lidarrGet = async <T = unknown>(
  lidarrPath: string,
  query: Record<string, unknown> = {}
): Promise<ProxyResponse<T>> => {
  const { url, headers } = getLidarrConfig();
  const params = new URLSearchParams(
    Object.entries(query).map(([key, value]) => [key, String(value)])
  ).toString();
  const sep = params ? "?" : "";
  const response = await lidarrFetch(
    `${url}/api/v1${lidarrPath}${sep}${params}`,
    {
      headers,
    }
  );
  return {
    status: response.status,
    data: await response.json(),
    ok: response.ok,
  };
};

export { lidarrGet };
