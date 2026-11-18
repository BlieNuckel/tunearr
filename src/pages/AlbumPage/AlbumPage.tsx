import { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import useReleaseGroupDetails from "@/hooks/useReleaseGroupDetails";
import useReleaseGroupLabel from "@/hooks/useReleaseGroupLabel";
import useArtistReleaseGroups from "@/hooks/useArtistReleaseGroups";
import useLibraryAlbums from "@/hooks/useLibraryAlbums";
import useWantedAlbums from "@/hooks/useWantedAlbums";
import useSimilarAlbums from "@/hooks/useSimilarAlbums";
import ReleaseSectionWithStatus from "@/pages/ArtistPage/components/ReleaseSectionWithStatus";
import AlbumHeaderSection from "./components/AlbumHeaderSection";
import AlbumTracklist from "./components/AlbumTracklist";
import { readAlbumPreview } from "@/utils/navPreview";

/**
 * Every section loads and fails on its own: the header waits on album details,
 * and a busy MusicBrainz costs one section its content, not the whole page.
 * Coming from a card, the header and the sections that need the artist start
 * from what the card showed, and swap in the fetched details when they land.
 */
export default function AlbumPage() {
  const { mbid } = useParams<{ mbid: string }>();
  const location = useLocation();
  const details = useReleaseGroupDetails(mbid);
  const label = useReleaseGroupLabel(mbid);
  const preview = readAlbumPreview(location.state, mbid);
  const album = details.album ?? preview;
  const more = useArtistReleaseGroups(album?.artistMbid);
  const { isAlbumInLibrary, getAlbumLibrary } = useLibraryAlbums();
  const { isAlbumWanted } = useWantedAlbums();
  const similar = useSimilarAlbums(mbid);

  const otherReleases = useMemo(
    () => more.releaseGroups.filter((rg) => rg.id !== album?.mbid),
    [more.releaseGroups, album?.mbid]
  );

  const waitingForArtistName = !album && details.loading && !details.retrying;

  return (
    <div>
      <AlbumHeaderSection
        album={album}
        fromPreview={details.album === null && preview !== null}
        details={details}
        label={label.label}
        labelState={label}
        inLibrary={album ? isAlbumInLibrary(album.mbid) : false}
        initialWanted={album ? isAlbumWanted(album.mbid) : false}
        library={album ? getAlbumLibrary(album.mbid) : null}
      />

      {mbid && (
        <AlbumTracklist
          albumMbid={waitingForArtistName ? null : mbid}
          artistName={album?.artistName ?? null}
        />
      )}

      {album?.artistMbid && (
        <ReleaseSectionWithStatus
          title="More from this artist"
          subject="more from this artist"
          items={otherReleases}
          state={more}
          getAlbumLibrary={getAlbumLibrary}
        />
      )}

      <ReleaseSectionWithStatus
        title="Similar albums"
        subject="similar albums"
        items={similar.albums}
        state={similar}
        getAlbumLibrary={getAlbumLibrary}
      />
    </div>
  );
}
