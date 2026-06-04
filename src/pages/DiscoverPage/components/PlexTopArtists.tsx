import useHaptics from "@/hooks/useHaptics";
import type { TopArtistsRange } from "@/hooks/useDiscover";

interface PlexArtist {
  name: string;
  thumb?: string;
  viewCount: number;
}

interface PlexTopArtistsProps {
  artists: PlexArtist[];
  selectedArtist: string | null;
  onSelect: (name: string) => void;
  range: TopArtistsRange;
  onRangeChange: (range: TopArtistsRange) => void;
  refreshing?: boolean;
}

const RANGE_OPTIONS: { value: TopArtistsRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "12months", label: "12 months" },
  { value: "6months", label: "6 months" },
  { value: "4weeks", label: "4 weeks" },
];

export default function PlexTopArtists({
  artists,
  selectedArtist,
  onSelect,
  range,
  onRangeChange,
  refreshing,
}: PlexTopArtistsProps) {
  const haptics = useHaptics();

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Based on your listening
        </h2>
        <div className="flex flex-wrap gap-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                haptics.light();
                onRangeChange(opt.value);
              }}
              className={`px-2 py-0.5 rounded-full text-xs border-2 border-black shadow-cartoon-sm transition-all active:translate-y-[1px] active:shadow-cartoon-pressed ${
                range === opt.value
                  ? "bg-sky-400 text-black font-bold"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-sky-50 dark:hover:bg-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {artists.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
          No plays in this period yet.
        </p>
      ) : (
        <div
          className={`flex flex-wrap gap-2 transition-opacity ${
            refreshing ? "opacity-50" : ""
          }`}
        >
          {artists.map((artist) => (
            <button
              key={artist.name}
              onClick={() => {
                haptics.light();
                onSelect(artist.name);
              }}
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full text-sm border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all ${
                selectedArtist === artist.name
                  ? "bg-pink-400 text-black font-bold dark:text-black"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-gray-700"
              }`}
            >
              {artist.thumb && (
                <img
                  src={artist.thumb}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover border border-black"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              {artist.name}
              <span className="text-xs opacity-60">
                {artist.viewCount}
                <span className="hidden sm:inline"> plays</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
