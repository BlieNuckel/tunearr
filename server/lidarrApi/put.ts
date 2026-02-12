import { getLidarrConfig } from "./config";
import { ProxyResponse } from "./types";

/** Generic proxy helper for PUT requests */
const lidarrPut = async <T = unknown>(
  lidarrPath: string,
  body: unknown,
): Promise<ProxyResponse<T>> => {
  const { url, headers } = getLidarrConfig();
  const response = await fetch(`${url}/api/v1${lidarrPath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
};

export { lidarrPut };
