import { useState, useCallback } from "react";

/**
 * Hook to manage the multi-step "add to Lidarr" flow:
 * 1. Check if artist exists
 * 2. If not, look up artist by MBID and add with monitor:none
 * 3. Find album's Lidarr ID by matching foreignAlbumId
 * 4. Set album as monitored
 * 5. Trigger AlbumSearch command
 *
 * @returns {{ state: string, errorMsg: string|null, addToLidarr: (params: {artistMbid: string, albumMbid: string}) => Promise<void> }}
 */
export default function useLidarr() {
  const [state, setState] = useState("idle");
  const [errorMsg, setErrorMsg] = useState(null);

  const addToLidarr = useCallback(async ({ artistMbid, albumMbid }) => {
    setState("adding");
    setErrorMsg(null);

    try {
      // 1. Check if artist already exists in Lidarr
      const artistsRes = await fetch("/api/lidarr/artist");
      if (!artistsRes.ok) throw new Error("Failed to fetch artists");
      const artists = await artistsRes.json();
      let artist = artists.find((a) => a.foreignArtistId === artistMbid);

      if (!artist) {
        // 2. Look up artist by MBID
        const lookupRes = await fetch(
          `/api/lidarr/artist/lookup?term=lidarr:${artistMbid}`
        );
        if (!lookupRes.ok) throw new Error("Artist lookup failed");
        const lookupResults = await lookupRes.json();
        if (!lookupResults.length) throw new Error("Artist not found in Lidarr lookup");
        const lookupArtist = lookupResults[0];

        // Fetch profiles and root folder
        const [rootFolderRes, qualityRes, metadataRes] = await Promise.all([
          fetch("/api/lidarr/rootfolder"),
          fetch("/api/lidarr/qualityprofile"),
          fetch("/api/lidarr/metadataprofile"),
        ]);

        if (!rootFolderRes.ok || !qualityRes.ok || !metadataRes.ok) {
          throw new Error("Failed to fetch Lidarr profiles");
        }

        const rootFolders = await rootFolderRes.json();
        const qualityProfiles = await qualityRes.json();
        const metadataProfiles = await metadataRes.json();

        if (!rootFolders.length) throw new Error("No root folder configured in Lidarr");
        if (!qualityProfiles.length) throw new Error("No quality profile configured in Lidarr");
        if (!metadataProfiles.length) throw new Error("No metadata profile configured in Lidarr");

        // 3. Add artist with monitor: none
        const addRes = await fetch("/api/lidarr/artist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...lookupArtist,
            rootFolderPath: rootFolders[0].path,
            qualityProfileId: qualityProfiles[0].id,
            metadataProfileId: metadataProfiles[0].id,
            monitored: true,
            monitorNewItems: "none",
            addOptions: { monitor: "none", searchForMissingAlbums: false },
          }),
        });

        if (!addRes.ok) {
          const err = await addRes.json();
          // Artist may already exist (race condition)
          if (!err?.[0]?.errorMessage?.includes("already been added")) {
            throw new Error(err?.[0]?.errorMessage || "Failed to add artist");
          }
          // Re-fetch to get the existing artist
          const refetchRes = await fetch("/api/lidarr/artist");
          const refetchArtists = await refetchRes.json();
          artist = refetchArtists.find((a) => a.foreignArtistId === artistMbid);
          if (!artist) throw new Error("Artist added but not found");
        } else {
          artist = await addRes.json();
        }
      }

      // 4. Find the album's Lidarr ID
      const albumsRes = await fetch(`/api/lidarr/album?artistId=${artist.id}`);
      if (!albumsRes.ok) throw new Error("Failed to fetch albums");
      const albums = await albumsRes.json();
      const album = albums.find((a) => a.foreignAlbumId === albumMbid);

      if (!album) throw new Error("Album not found in Lidarr");

      if (album.monitored) {
        setState("already_monitored");
        return;
      }

      // 5. Set album as monitored
      const monitorRes = await fetch("/api/lidarr/album/monitor", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumIds: [album.id], monitored: true }),
      });
      if (!monitorRes.ok) throw new Error("Failed to monitor album");

      // 6. Trigger album search
      await fetch("/api/lidarr/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "AlbumSearch", albumIds: [album.id] }),
      });

      setState("success");
    } catch (err) {
      setState("error");
      setErrorMsg(err.message);
    }
  }, []);

  return { state, errorMsg, addToLidarr };
}
