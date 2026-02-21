interface PlexArtist {
  name: string;
  thumb?: string;
  viewCount: number;
}

interface PlexTopArtistsProps {
  artists: PlexArtist[];
  selectedArtist: string | null;
  onSelect: (name: string) => void;
}

export default function PlexTopArtists({
  artists,
  selectedArtist,
  onSelect,
}: PlexTopArtistsProps) {
  if (artists.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
        Based on your listening
      </h2>
      <div className="flex flex-wrap gap-2">
        {artists.map((artist) => (
          <button
            key={artist.name}
            onClick={() => onSelect(artist.name)}
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
    </div>
  );
}
