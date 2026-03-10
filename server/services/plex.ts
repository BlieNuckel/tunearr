import { resilientFetch } from "../api/resilientFetch";
import { getPlexConfig } from "../api/plex/config";

type PlexThumbnailResult =
  | { ok: true; buffer: Buffer; contentType: string | null }
  | { ok: false; status: number };

export async function fetchPlexThumbnail(
  plexToken: string,
  path: string
): Promise<PlexThumbnailResult> {
  const { baseUrl, headers } = getPlexConfig(plexToken);
  const upstream = await resilientFetch(`${baseUrl}${path}`, { headers });

  if (!upstream.ok) {
    return { ok: false, status: upstream.status };
  }

  const contentType = upstream.headers.get("content-type");
  const buffer = Buffer.from(await upstream.arrayBuffer());
  return { ok: true, buffer, contentType };
}
