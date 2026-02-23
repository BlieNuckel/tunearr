import { Medium } from "../types";
import { PlayIcon, PauseIcon } from "./icons";
import Skeleton from "./Skeleton";

/** @param {number | null} ms - duration in milliseconds */
function formatDuration(ms: number | null): string {
  if (!ms) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

interface TrackListProps {
  media: Medium[];
  loading: boolean;
  error: string | null;
  onTogglePreview?: (url: string) => void;
  isTrackPlaying?: (url: string) => boolean;
}

export default function TrackList({
  media,
  loading,
  error,
  onTogglePreview,
  isTrackPlaying,
}: TrackListProps) {
  if (loading)
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-2 min-h-[44px]">
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-8" />
          </div>
        ))}
      </div>
    );
  if (error)
    return <p className="text-sm text-red-400 dark:text-red-300">{error}</p>;
  if (media.length === 0)
    return (
      <p className="text-sm text-gray-500 dark:text-gray-300">
        No tracks found.
      </p>
    );

  return (
    <>
      {media.map((medium) => (
        <div key={medium.position}>
          {media.length > 1 && (
            <p className="text-gray-400 text-xs font-medium mb-1 mt-2 first:mt-0">
              {medium.format || "Disc"} {medium.position}
              {medium.title && ` — ${medium.title}`}
            </p>
          )}
          <ol className="space-y-1">
            {medium.tracks.map((track, trackIndex) => {
              const hasPreview =
                !!track.previewUrl && !!onTogglePreview && !!isTrackPlaying;
              const playing = hasPreview && isTrackPlaying(track.previewUrl!);

              const rowContent = (
                <>
                  {hasPreview && (
                    <span
                      className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full transition-colors ${
                        playing
                          ? "text-amber-500"
                          : "text-gray-500 dark:text-gray-400 group-hover:text-amber-500 dark:group-hover:text-amber-400"
                      }`}
                      data-testid={`preview-button-${track.position}`}
                    >
                      {playing ? (
                        <PauseIcon className="w-5 h-5" />
                      ) : (
                        <PlayIcon className="w-5 h-5" />
                      )}
                    </span>
                  )}
                  <span className="flex-1 min-w-0 truncate text-gray-700 dark:text-gray-200">
                    {track.title}
                  </span>
                  {track.length && (
                    <span
                      data-testid="track-duration"
                      className="text-xs flex-shrink-0 text-gray-600 dark:text-gray-400"
                    >
                      {formatDuration(track.length)}
                    </span>
                  )}
                </>
              );

              return (
                <li
                  key={track.position}
                  className="stagger-fade-in"
                  style={
                    { "--stagger-index": trackIndex } as React.CSSProperties
                  }
                >
                  {hasPreview ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePreview(track.previewUrl!);
                      }}
                      className="group w-full flex items-center gap-2 text-sm text-left min-h-[44px]"
                      aria-label={playing ? "Pause preview" : "Play preview"}
                    >
                      {rowContent}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-sm min-h-[44px]">
                      {rowContent}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </>
  );
}
