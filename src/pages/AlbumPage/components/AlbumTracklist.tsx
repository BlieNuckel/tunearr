import TrackList from "@/components/TrackList";
import SectionStatus from "@/components/SectionStatus";
import useReleaseTracks from "@/hooks/useReleaseTracks";
import useAudioPreview from "@/hooks/useAudioPreview";

interface AlbumTracklistProps {
  /** Null while waiting to learn the artist name, so previews come with the first load. */
  albumMbid: string | null;
  artistName: string | null;
}

export default function AlbumTracklist({
  albumMbid,
  artistName,
}: AlbumTracklistProps) {
  const tracks = useReleaseTracks(albumMbid, artistName);
  const { toggle, isTrackPlaying } = useAudioPreview();
  const failed = tracks.retrying || tracks.error !== null;

  return (
    <section className="mb-8">
      <h2 className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wide mb-3">
        Tracklist
      </h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-md p-4">
        {failed ? (
          <SectionStatus
            subject="the tracklist"
            error={tracks.error}
            errorKind={tracks.errorKind}
            retrying={tracks.retrying}
            onRetry={() => void tracks.refresh()}
          />
        ) : (
          <TrackList
            media={tracks.media}
            loading={albumMbid === null || tracks.loading}
            error={null}
            onTogglePreview={toggle}
            isTrackPlaying={isTrackPlaying}
          />
        )}
      </div>
    </section>
  );
}
