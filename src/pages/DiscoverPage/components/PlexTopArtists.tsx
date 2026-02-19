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

export default function PlexTopArtists({ artists, selectedArtist, onSelect }: PlexTopArtistsProps) {
  if (artists.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-medium text-gray-400 mb-2">Based on your listening</h2>
      <div className="flex flex-wrap gap-2">
        {artists.map((artist) => (
          <button
            key={artist.name}
            onClick={() => onSelect(artist.name)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
              selectedArtist === artist.name
                ? "bg-indigo-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {artist.thumb && (
              <img
                src={artist.thumb}
                alt=""
                className="w-5 h-5 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            {artist.name}
            <span className="text-xs opacity-60">{artist.viewCount} plays</span>
          </button>
        ))}
      </div>
    </div>
  );
}
