import type { SlskdTransferGroup } from "./types";
import { getSlskdConfig } from "./config";

export async function enqueueDownload(
  username: string,
  files: { filename: string; size: number }[]
): Promise<void> {
  const { baseUrl, headers } = getSlskdConfig();

  const response = await fetch(
    `${baseUrl}/api/v0/transfers/downloads/${encodeURIComponent(username)}`,
    {
      method: "POST",
      headers,
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
  const { baseUrl, headers } = getSlskdConfig();

  const response = await fetch(`${baseUrl}/api/v0/transfers/downloads`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`slskd get transfers failed: ${response.status}`);
  }

  return response.json() as Promise<SlskdTransferGroup[]>;
}

export async function cancelDownload(
  username: string,
  id: string
): Promise<void> {
  const { baseUrl, headers } = getSlskdConfig();

  const response = await fetch(
    `${baseUrl}/api/v0/transfers/downloads/${encodeURIComponent(username)}/${encodeURIComponent(id)}`,
    { method: "DELETE", headers }
  );

  if (!response.ok) {
    throw new Error(`slskd cancel download failed: ${response.status}`);
  }
}
