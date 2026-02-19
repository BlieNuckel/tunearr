import { Medium } from "../types";

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
}

export default function TrackList({ media, loading, error }: TrackListProps) {
  if (loading)
    return <p className="text-gray-400 text-sm">Loading tracks...</p>;
  if (error) return <p className="text-red-400 text-sm">{error}</p>;
  if (media.length === 0)
    return <p className="text-gray-500 text-sm">No tracks found.</p>;

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
          <ol className="space-y-0.5">
            {medium.tracks.map((track) => (
              <li
                key={track.position}
                className="flex items-baseline gap-2 text-sm"
              >
                <span className="text-gray-600 w-5 text-right flex-shrink-0">
                  {track.position}
                </span>
                <span className="text-gray-300 truncate">{track.title}</span>
                {track.length && (
                  <span
                    data-testid="track-duration"
                    className="text-gray-600 text-xs ml-auto flex-shrink-0"
                  >
                    {formatDuration(track.length)}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </>
  );
}
