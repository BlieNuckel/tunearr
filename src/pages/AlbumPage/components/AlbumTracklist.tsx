import { useEffect } from "react";
import TrackList from "@/components/TrackList";
import useReleaseTracks from "@/hooks/useReleaseTracks";
import useAudioPreview from "@/hooks/useAudioPreview";

interface AlbumTracklistProps {
  albumMbid: string;
  artistName: string;
}

export default function AlbumTracklist({
  albumMbid,
  artistName,
}: AlbumTracklistProps) {
  const { media, loading, error, fetchTracks } = useReleaseTracks();
  const { toggle, isTrackPlaying } = useAudioPreview();

  useEffect(() => {
    void fetchTracks(albumMbid, artistName);
  }, [albumMbid, artistName, fetchTracks]);

  return (
    <section className="mb-8">
      <h2 className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wide mb-3">
        Tracklist
      </h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-md p-4">
        <TrackList
          media={media}
          loading={loading}
          error={error}
          onTogglePreview={toggle}
          isTrackPlaying={isTrackPlaying}
        />
      </div>
    </section>
  );
}
