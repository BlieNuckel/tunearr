import express from "express";
import type { Request, Response } from "express";
import { loadConfig } from "../config.ts";

const router = express.Router();

interface LidarrConfig {
  url: string;
  headers: Record<string, string>;
}

interface ProxyResponse<T = unknown> {
  status: number;
  data: T;
}

const getLidarrConfig = (): LidarrConfig => {
  const config = loadConfig();
  if (!config.lidarrUrl || !config.lidarrApiKey) {
    throw new Error("Lidarr not configured");
  }
  return {
    url: config.lidarrUrl,
    headers: {
      "X-Api-Key": config.lidarrApiKey,
      "Content-Type": "application/json",
    },
  };
};

/** Generic proxy helper for GET requests */
const proxyGet = async <T = unknown>(
  lidarrPath: string,
  query: Record<string, unknown> = {}
): Promise<ProxyResponse<T>> => {
  const { url, headers } = getLidarrConfig();
  const params = new URLSearchParams(
    Object.entries(query).map(([key, value]) => [key, String(value)])
  ).toString();
  const sep = params ? "?" : "";
  const response = await fetch(`${url}/api/v1${lidarrPath}${sep}${params}`, {
    headers,
  });
  return { status: response.status, data: await response.json() };
};

/** Generic proxy helper for POST requests */
const proxyPost = async <T = unknown>(
  lidarrPath: string,
  body: unknown
): Promise<ProxyResponse<T>> => {
  const { url, headers } = getLidarrConfig();
  const response = await fetch(`${url}/api/v1${lidarrPath}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
};

/** Generic proxy helper for PUT requests */
const proxyPut = async <T = unknown>(
  lidarrPath: string,
  body: unknown
): Promise<ProxyResponse<T>> => {
  const { url, headers } = getLidarrConfig();
  const response = await fetch(`${url}/api/v1${lidarrPath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
};

/**
 * Add an album to Lidarr by MusicBrainz release group ID.
 *
 * Flow:
 * 1. Look up the album in Lidarr using lidarr:<mbid>
 * 2. Ensure the artist exists (add if missing)
 * 3. Add/monitor the album with monitored: true
 * 4. Trigger AlbumSearch
 */
router.post("/add", async (req: Request, res: Response) => {
  const { albumMbid } = req.body;
  if (!albumMbid) {
    return res.status(400).json({ error: "albumMbid is required" });
  }

  try {
    // 1. Look up album by MBID
    const lookupResult = await proxyGet<unknown[]>("/album/lookup", { term: `lidarr:${albumMbid}` });
    if (lookupResult.status !== 200 || !lookupResult.data?.length) {
      return res.status(404).json({ error: "Album not found" });
    }
    const lookupAlbum = lookupResult.data[0] as Record<string, unknown>;
    const artistMbid = (lookupAlbum.artist as Record<string, unknown>)?.foreignArtistId as string;
    if (!artistMbid) {
      return res.status(404).json({ error: "Could not determine artist from album lookup" });
    }

    // 2. Check if artist already exists in Lidarr
    const artistsResult = await proxyGet<unknown[]>("/artist");
    let artist = artistsResult.data.find((a: unknown) => (a as Record<string, unknown>).foreignArtistId === artistMbid) as Record<string, unknown> | undefined;

    if (!artist) {
      // Look up artist metadata and fetch profiles in parallel
      const [artistLookup, rootFolders, qualityProfiles, metadataProfiles] =
        await Promise.all([
          proxyGet<unknown[]>("/artist/lookup", { term: `lidarr:${artistMbid}` }),
          proxyGet<unknown[]>("/rootfolder"),
          proxyGet<unknown[]>("/qualityprofile"),
          proxyGet<unknown[]>("/metadataprofile"),
        ]);

      if (!artistLookup.data?.length) {
        return res.status(404).json({ error: "Artist not found in Lidarr lookup" });
      }
      if (!rootFolders.data?.length) {
        return res.status(400).json({ error: "No root folder configured in Lidarr" });
      }
      if (!qualityProfiles.data?.length) {
        return res.status(400).json({ error: "No quality profile configured in Lidarr" });
      }
      if (!metadataProfiles.data?.length) {
        return res.status(400).json({ error: "No metadata profile configured in Lidarr" });
      }

      const addArtistResult = await proxyPost<Record<string, unknown>>("/artist", {
        ...(artistLookup.data[0] as Record<string, unknown>),
        rootFolderPath: (rootFolders.data[0] as Record<string, unknown>).path,
        qualityProfileId: (qualityProfiles.data[0] as Record<string, unknown>).id,
        metadataProfileId: (metadataProfiles.data[0] as Record<string, unknown>).id,
        monitored: true,
        monitorNewItems: "none",
        addOptions: { monitor: "none", searchForMissingAlbums: false },
      });

      if (addArtistResult.status >= 200 && addArtistResult.status < 300) {
        artist = addArtistResult.data;
      } else {
        // Handle race condition — artist may have been added concurrently
        const errorData = addArtistResult.data as unknown;
        const errorArray = Array.isArray(errorData) ? errorData : [];
        const errorMessage = (errorArray[0] as Record<string, unknown>)?.errorMessage as string;
        if (!errorMessage?.includes("already been added")) {
          throw new Error(errorMessage || "Failed to add artist");
        }
      }

      // Re-fetch so we have the canonical Lidarr representation for the PUT
      const refetch = await proxyGet<unknown[]>("/artist");
      artist = refetch.data.find((a: unknown) => (a as Record<string, unknown>).foreignArtistId === artistMbid) as Record<string, unknown> | undefined;
      if (!artist) throw new Error("Artist added but not found");
    }

    // Ensure artist is monitored — needed after adding (Lidarr bug: addOptions.monitor
    // "none" overrides monitored: true) and for pre-existing unmonitored artists
    if (!artist.monitored) {
      await proxyPut(`/artist/${artist.id}`, { ...artist, monitored: true });
      artist = { ...artist, monitored: true };
    }

    // 4. Check if album already exists for this artist
    const albumsResult = await proxyGet<unknown[]>("/album", { artistId: artist.id });
    let album = albumsResult.data.find((a: unknown) => (a as Record<string, unknown>).foreignAlbumId === albumMbid) as Record<string, unknown> | undefined;

    if (album?.monitored) {
      return res.json({ status: "already_monitored" });
    }

    if (!album) {
      // Add the album with monitored: true
      const addAlbumResult = await proxyPost<Record<string, unknown>>("/album", {
        ...lookupAlbum,
        artist,
        monitored: true,
        addOptions: { searchForNewAlbum: true },
      });

      if (addAlbumResult.status >= 200 && addAlbumResult.status < 300) {
        album = addAlbumResult.data;
      } else {
        const errorData = addAlbumResult.data as unknown;
        const errorArray = Array.isArray(errorData) ? errorData : [];
        const dataRecord = addAlbumResult.data as Record<string, unknown>;
        const errMsg = (errorArray[0] as Record<string, unknown>)?.errorMessage
          || dataRecord?.message
          || JSON.stringify(addAlbumResult.data);
        // Album may have been added by Lidarr in the background — re-fetch
        const refetch = await proxyGet<unknown[]>("/album", { artistId: artist.id });
        album = refetch.data.find((a: unknown) => (a as Record<string, unknown>).foreignAlbumId === albumMbid) as Record<string, unknown> | undefined;
        if (!album) throw new Error(`Failed to add album: ${errMsg}`);
      }
    }

    // 4. Set monitored if the album existed but wasn't monitored
    if (!album.monitored) {
      const monitorResult = await proxyPut("/album/monitor", {
        albumIds: [album.id],
        monitored: true,
      });
      if (monitorResult.status < 200 || monitorResult.status >= 300) {
        throw new Error("Failed to monitor album");
      }
    }

    // 5. Trigger album search
    await proxyPost("/command", { name: "AlbumSearch", albumIds: [album.id] });

    res.json({ status: "success" });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// Queue
router.get("/queue", async (req: Request, res: Response) => {
  try {
    const result = await proxyGet("/queue", {
      page: req.query.page || 1,
      pageSize: req.query.pageSize || 20,
      includeArtist: true,
      includeAlbum: true,
    });
    res.status(result.status).json(result.data);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// Wanted/missing
router.get("/wanted/missing", async (req: Request, res: Response) => {
  try {
    const result = await proxyGet("/wanted/missing", {
      page: req.query.page || 1,
      pageSize: req.query.pageSize || 20,
      includeArtist: true,
      sortKey: "title",
      sortDirection: "ascending",
    });
    res.status(result.status).json(result.data);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// History
router.get("/history", async (req: Request, res: Response) => {
  try {
    const query: Record<string, unknown> = {
      page: req.query.page || 1,
      pageSize: req.query.pageSize || 20,
      includeArtist: true,
      includeAlbum: true,
      sortKey: "date",
      sortDirection: "descending",
    };
    if (req.query.eventType) query.eventType = req.query.eventType;
    const result = await proxyGet("/history", query);
    res.status(result.status).json(result.data);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
