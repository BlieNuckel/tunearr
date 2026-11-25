import type { SlskdTransferGroup } from "./types";
import { slskdFetch } from "./request";

export async function enqueueDownload(
  username: string,
  files: { filename: string; size: number }[]
): Promise<void> {
  const response = await slskdFetch(
    `/api/v0/transfers/downloads/${encodeURIComponent(username)}`,
    {
      method: "POST",
      body: JSON.stringify(
        files.map((f) => ({ filename: f.filename, size: f.size }))
      ),
    }
  );

  if (!response.ok) {
    throw new Error(`slskd enqueue download failed: ${response.status}`);
  }
}

export async function getDownloadTransfers(): Promise<SlskdTransferGroup[]> {
  const response = await slskdFetch("/api/v0/transfers/downloads");

  if (!response.ok) {
    throw new Error(`slskd get transfers failed: ${response.status}`);
  }

  return response.json() as Promise<SlskdTransferGroup[]>;
}

export async function cancelDownload(
  username: string,
  id: string
): Promise<void> {
  const response = await slskdFetch(
    `/api/v0/transfers/downloads/${encodeURIComponent(username)}/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    throw new Error(`slskd cancel download failed: ${response.status}`);
  }
}
