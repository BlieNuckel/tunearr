import TrackList from "@/components/TrackList";
import SectionStatus, { type SectionState } from "@/components/SectionStatus";
import useAudioPreview from "@/hooks/useAudioPreview";
import type { Medium } from "@/types";

interface AlbumTracklistProps {
  tracks: SectionState & { media: Medium[] };
  /** True while waiting to learn the artist name, so previews come with the first load. */
  waiting: boolean;
}

export default function AlbumTracklist({
  tracks,
  waiting,
}: AlbumTracklistProps) {
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
            loading={waiting || tracks.loading}
            error={null}
            onTogglePreview={toggle}
            isTrackPlaying={isTrackPlaying}
          />
        )}
      </div>
    </section>
  );
}
