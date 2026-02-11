const express = require("express");
const { loadConfig } = require("../config");

const router = express.Router();

/** @returns {{ url: string, headers: Record<string, string> }} */
function getLidarrConfig() {
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
}

/** Generic proxy helper for GET requests */
async function proxyGet(lidarrPath, query = {}) {
  const { url, headers } = getLidarrConfig();
  const params = new URLSearchParams(query).toString();
  const sep = params ? "?" : "";
  const response = await fetch(`${url}/api/v1${lidarrPath}${sep}${params}`, {
    headers,
  });
  return { status: response.status, data: await response.json() };
}

/** Generic proxy helper for POST requests */
async function proxyPost(lidarrPath, body) {
  const { url, headers } = getLidarrConfig();
  const response = await fetch(`${url}/api/v1${lidarrPath}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

/** Generic proxy helper for PUT requests */
async function proxyPut(lidarrPath, body) {
  const { url, headers } = getLidarrConfig();
  const response = await fetch(`${url}/api/v1${lidarrPath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

/**
 * Add an album to Lidarr by MusicBrainz release group ID.
 *
 * Flow:
 * 1. Look up the album in Lidarr using lidarr:<mbid>
 * 2. Ensure the artist exists (add if missing)
 * 3. Add/monitor the album with monitored: true
 * 4. Trigger AlbumSearch
 */
router.post("/add", async (req, res) => {
  const { albumMbid } = req.body;
  if (!albumMbid) {
    return res.status(400).json({ error: "albumMbid is required" });
  }

  try {
    // 1. Look up album by MBID
    const lookupResult = await proxyGet("/album/lookup", { term: `lidarr:${albumMbid}` });
    if (lookupResult.status !== 200 || !lookupResult.data?.length) {
      return res.status(404).json({ error: "Album not found" });
    }
    const lookupAlbum = lookupResult.data[0];
    const artistMbid = lookupAlbum.artist?.foreignArtistId;
    if (!artistMbid) {
      return res.status(404).json({ error: "Could not determine artist from album lookup" });
    }

    // 2. Check if artist already exists in Lidarr
    const artistsResult = await proxyGet("/artist");
    let artist = artistsResult.data.find((a) => a.foreignArtistId === artistMbid);

    if (!artist) {
      // Look up artist metadata and fetch profiles in parallel
      const [artistLookup, rootFolders, qualityProfiles, metadataProfiles] =
        await Promise.all([
          proxyGet("/artist/lookup", { term: `lidarr:${artistMbid}` }),
          proxyGet("/rootfolder"),
          proxyGet("/qualityprofile"),
          proxyGet("/metadataprofile"),
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

      const addArtistResult = await proxyPost("/artist", {
        ...artistLookup.data[0],
        rootFolderPath: rootFolders.data[0].path,
        qualityProfileId: qualityProfiles.data[0].id,
        metadataProfileId: metadataProfiles.data[0].id,
        monitored: true,
        monitorNewItems: "none",
        addOptions: { monitor: "none", searchForMissingAlbums: false },
      });

      if (addArtistResult.status >= 200 && addArtistResult.status < 300) {
        artist = addArtistResult.data;
      } else {
        // Handle race condition — artist may have been added concurrently
        if (!addArtistResult.data?.[0]?.errorMessage?.includes("already been added")) {
          throw new Error(addArtistResult.data?.[0]?.errorMessage || "Failed to add artist");
        }
      }

      // Re-fetch so we have the canonical Lidarr representation for the PUT
      const refetch = await proxyGet("/artist");
      artist = refetch.data.find((a) => a.foreignArtistId === artistMbid);
      if (!artist) throw new Error("Artist added but not found");
    }

    // Ensure artist is monitored — needed after adding (Lidarr bug: addOptions.monitor
    // "none" overrides monitored: true) and for pre-existing unmonitored artists
    if (!artist.monitored) {
      await proxyPut(`/artist/${artist.id}`, { ...artist, monitored: true });
      artist = { ...artist, monitored: true };
    }

    // 4. Check if album already exists for this artist
    const albumsResult = await proxyGet("/album", { artistId: artist.id });
    let album = albumsResult.data.find((a) => a.foreignAlbumId === albumMbid);

    if (album?.monitored) {
      return res.json({ status: "already_monitored" });
    }

    if (!album) {
      // Add the album with monitored: true
      const addAlbumResult = await proxyPost("/album", {
        ...lookupAlbum,
        artist,
        monitored: true,
        addOptions: { searchForNewAlbum: true },
      });

      if (addAlbumResult.status >= 200 && addAlbumResult.status < 300) {
        album = addAlbumResult.data;
      } else {
        const errMsg = addAlbumResult.data?.[0]?.errorMessage
          || addAlbumResult.data?.message
          || JSON.stringify(addAlbumResult.data);
        // Album may have been added by Lidarr in the background — re-fetch
        const refetch = await proxyGet("/album", { artistId: artist.id });
        album = refetch.data.find((a) => a.foreignAlbumId === albumMbid);
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
    res.status(500).json({ error: err.message });
  }
});

// Queue
router.get("/queue", async (req, res) => {
  try {
    const result = await proxyGet("/queue", {
      page: req.query.page || 1,
      pageSize: req.query.pageSize || 20,
      includeArtist: true,
      includeAlbum: true,
    });
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Wanted/missing
router.get("/wanted/missing", async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

// History
router.get("/history", async (req, res) => {
  try {
    const query = {
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
