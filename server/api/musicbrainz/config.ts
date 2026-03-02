import { resilientFetch } from "../resilientFetch";

export const MB_BASE = "https://musicbrainz.org/ws/2";

export const MB_HEADERS = {
  "User-Agent": "Tunearr/0.1.0 (github.com/tunearr)",
  Accept: "application/json",
};

// Rate limiter for direct MusicBrainz API calls (1 request per second)
let lastMbRequestTime = 0;

export async function rateLimitedMbFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastMbRequestTime;
  const minInterval = 1000;

  if (elapsed < minInterval) {
    const delay = minInterval - elapsed;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  lastMbRequestTime = Date.now();
  return resilientFetch(url, options);
}
