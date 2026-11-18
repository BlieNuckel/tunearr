import { useMemo } from "react";
import { useParams } from "react-router-dom";
import useArtistDetails from "@/hooks/useArtistDetails";
import useArtistReleaseGroups from "@/hooks/useArtistReleaseGroups";
import useLibraryAlbums from "@/hooks/useLibraryAlbums";
import useLibraryArtists from "@/hooks/useLibraryArtists";
import useSimilarArtists from "@/hooks/useSimilarArtists";
import useArtistLiveDates from "@/hooks/useArtistLiveDates";
import { groupArtistReleases } from "@/utils/groupArtistReleases";
import ArtistHeaderSection from "./components/ArtistHeaderSection";
import ArtistDiscography from "./components/ArtistDiscography";
import SimilarArtists from "./components/SimilarArtists";
import ArtistLiveDates from "./components/ArtistLiveDates";

/** The header waits on artist details; the discography and the rest load and fail on their own. */
export default function ArtistPage() {
  const { mbid } = useParams<{ mbid: string }>();
  const details = useArtistDetails(mbid);
  const artist = details.artist;
  const releases = useArtistReleaseGroups(mbid);
  const releaseGroups = releases.releaseGroups;
  const { getAlbumLibrary } = useLibraryAlbums();
  const { isArtistInLibrary } = useLibraryArtists();
  const { artists: similarArtists, loading: similarLoading } =
    useSimilarArtists(artist?.name, mbid);
  const { dates: liveDates, tracking: liveTracking } = useArtistLiveDates(mbid);

  const sections = useMemo(
    () => (mbid ? groupArtistReleases(releaseGroups, mbid) : []),
    [releaseGroups, mbid]
  );

  return (
    <div>
      <ArtistHeaderSection
        artist={artist}
        details={details}
        inLibrary={artist ? isArtistInLibrary(mbid ?? "", artist.name) : false}
      />

      <ArtistLiveDates dates={liveDates} tracking={liveTracking} />

      <ArtistDiscography
        sections={sections}
        state={releases}
        getAlbumLibrary={getAlbumLibrary}
      />

      <SimilarArtists
        artists={similarArtists}
        loading={similarLoading}
        isArtistInLibrary={isArtistInLibrary}
      />
    </div>
  );
}
