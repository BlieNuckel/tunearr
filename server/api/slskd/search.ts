import type { SlskdSearchState, SlskdSearchResponse } from "./types";
import { getSlskdConfig } from "./config";
import { AsyncLock } from "../asyncLock";

const searchLock = new AsyncLock();

const POLL_INTERVAL_MS = 1000;
const MAX_POLL_DURATION_MS = 15000;

export function startSearch(searchText: string): Promise<SlskdSearchState> {
  return searchLock.acquire("slskd-search", async () => {
    const { baseUrl, headers } = getSlskdConfig();
    const id = crypto.randomUUID();

    const response = await fetch(`${baseUrl}/api/v0/searches`, {
      method: "POST",
      headers,
      body: JSON.stringify({ id, searchText }),
    });

    if (!response.ok) {
      throw new Error(`slskd search failed: ${response.status}`);
    }

    return response.json() as Promise<SlskdSearchState>;
  });
}

export async function waitForSearch(searchId: string): Promise<void> {
  const { baseUrl, headers } = getSlskdConfig();
  const deadline = Date.now() + MAX_POLL_DURATION_MS;

  while (Date.now() < deadline) {
    const response = await fetch(`${baseUrl}/api/v0/searches/${searchId}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`slskd search status failed: ${response.status}`);
    }

    const state = (await response.json()) as SlskdSearchState;
    if (state.isComplete) return;

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

export async function getSearchResponses(
  searchId: string
): Promise<SlskdSearchResponse[]> {
  const { baseUrl, headers } = getSlskdConfig();

  const response = await fetch(
    `${baseUrl}/api/v0/searches/${searchId}/responses`,
    {
      headers,
    }
  );

  if (!response.ok) {
    throw new Error(`slskd search responses failed: ${response.status}`);
  }

  return response.json() as Promise<SlskdSearchResponse[]>;
}

export async function deleteSearch(searchId: string): Promise<void> {
  const { baseUrl, headers } = getSlskdConfig();

  await fetch(`${baseUrl}/api/v0/searches/${searchId}`, {
    method: "DELETE",
    headers,
  });
}
