import type { TrackedDownload } from "./types";

const downloads = new Map<string, TrackedDownload>();

export function addDownload(download: TrackedDownload): void {
  downloads.set(download.nzoId, download);
}

export function getDownload(nzoId: string): TrackedDownload | undefined {
  return downloads.get(nzoId);
}

export function getAllDownloads(): TrackedDownload[] {
  return Array.from(downloads.values());
}

export function removeDownload(nzoId: string): boolean {
  return downloads.delete(nzoId);
}

export function clearDownloads(): void {
  downloads.clear();
}
