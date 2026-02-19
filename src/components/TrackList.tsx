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
  dark?: boolean;
}

export default function TrackList({
  media,
  loading,
  error,
  dark,
}: TrackListProps) {
  if (loading)
    return (
      <p className={`text-sm ${dark ? "text-gray-300" : "text-gray-400"}`}>
        Loading tracks...
      </p>
    );
  if (error)
    return (
      <p className={`text-sm ${dark ? "text-red-300" : "text-red-400"}`}>
        {error}
      </p>
    );
  if (media.length === 0)
    return (
      <p className={`text-sm ${dark ? "text-gray-300" : "text-gray-500"}`}>
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
          <ol className="space-y-0.5">
            {medium.tracks.map((track) => (
              <li
                key={track.position}
                className="flex items-baseline gap-2 text-sm"
              >
                <span
                  className={`w-5 text-right flex-shrink-0 ${dark ? "text-gray-400" : "text-gray-600"}`}
                >
                  {track.position}
                </span>
                <span
                  className={`flex-1 min-w-0 truncate ${dark ? "text-gray-200" : "text-gray-700"}`}
                >
                  {track.title}
                </span>
                {track.length && (
                  <span
                    data-testid="track-duration"
                    className={`text-xs flex-shrink-0 ${dark ? "text-gray-400" : "text-gray-600"}`}
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
