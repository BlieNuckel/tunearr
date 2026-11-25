import type { SlskdSearchState, SlskdSearchResponse } from "./types";
import { slskdFetch } from "./request";
import { AsyncLock } from "../asyncLock";
import { createLogger } from "../../logger";

const log = createLogger("slskd-search");
const searchLock = new AsyncLock();

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 45000;

export function startSearch(searchText: string): Promise<SlskdSearchState> {
  return searchLock.acquire("slskd-search", async () => {
    const id = crypto.randomUUID();

    log.info(`Starting slskd search (id=${id}, query="${searchText}")`);
    const response = await slskdFetch("/api/v0/searches", {
      method: "POST",
      body: JSON.stringify({ id, searchText }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `slskd search failed: ${response.status} ${response.statusText} - ${body}`
      );
    }

    const state = (await response.json()) as SlskdSearchState;
    log.info(`Search started: id=${state.id}, isComplete=${state.isComplete}`);
    return state;
  });
}

export type WaitResult = { completed: boolean; fileCount: number };

export async function waitForSearch(searchId: string): Promise<WaitResult> {
  const deadline = Date.now() + MAX_POLL_DURATION_MS;

  while (Date.now() < deadline) {
    const response = await slskdFetch(`/api/v0/searches/${searchId}`);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `slskd search status failed: ${response.status} ${response.statusText} - ${body}`
      );
    }

    const state = (await response.json()) as SlskdSearchState;
    if (state.isComplete) {
      log.info(
        `Search ${searchId} completed: ${state.responseCount} responses, ${state.fileCount} files`
      );
      return { completed: true, fileCount: state.fileCount };
    }

    if (state.responseCount > 0) {
      log.info(
        `Search ${searchId} in progress: ${state.responseCount} responses, ${state.fileCount} files so far`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  log.warn(`Search ${searchId} timed out after ${MAX_POLL_DURATION_MS}ms`);
  return { completed: false, fileCount: 0 };
}

export async function getSearchResponses(
  searchId: string
): Promise<SlskdSearchResponse[]> {
  const response = await slskdFetch(`/api/v0/searches/${searchId}/responses`);

  if (!response.ok) {
    throw new Error(`slskd search responses failed: ${response.status}`);
  }

  return response.json() as Promise<SlskdSearchResponse[]>;
}

export async function deleteSearch(searchId: string): Promise<void> {
  await slskdFetch(`/api/v0/searches/${searchId}`, { method: "DELETE" });
}
