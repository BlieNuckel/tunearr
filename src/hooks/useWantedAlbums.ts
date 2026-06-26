import { useState, useEffect, useMemo } from "react";
import type { WantedItem } from "@/types";

export default function useWantedAlbums() {
  const [wantedItems, setWantedItems] = useState<WantedItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/wanted");
        if (res.ok) {
          setWantedItems(await res.json());
        }
      } catch {
        // Wanted list may not be available yet
      }
    };
    load();
  }, []);

  const wantedAlbumMbids = useMemo(
    () => new Set(wantedItems.map((item) => item.albumMbid)),
    [wantedItems]
  );

  const isAlbumWanted = (albumMbid: string) => wantedAlbumMbids.has(albumMbid);

  return { isAlbumWanted };
}
