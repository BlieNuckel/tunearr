import { getDownload, removeDownload } from "../../api/slskd/downloadTracker";
import { getDownloadTransfers, cancelDownload } from "../../api/slskd/transfer";
import { createLogger } from "../../logger";
import { findMatchingTransfers } from "./transfers";

const log = createLogger("SABnzbd");

export async function deleteQueueItem(nzoId: string): Promise<void> {
  const dl = getDownload(nzoId);
  if (dl) {
    try {
      const transferGroups = await getDownloadTransfers();
      const transfers = findMatchingTransfers(
        dl.username,
        dl.files,
        transferGroups
      );
      await Promise.all(
        transfers.map((t) => cancelDownload(dl.username, t.id))
      );
    } catch (err) {
      log.error("Cancel transfers failed:", err);
    }
    removeDownload(nzoId);
  }
}
