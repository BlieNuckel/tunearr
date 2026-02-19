import { useState, useEffect, useRef } from "react";

interface LibraryArtist {
  id: number;
  name: string;
  foreignArtistId: string;
}

interface LibraryPickerProps {
  artists: LibraryArtist[];
  loading: boolean;
  selectedArtist: string | null;
  onSelect: (name: string) => void;
}

export default function LibraryPicker({
  artists,
  loading,
  selectedArtist,
  onSelect,
}: LibraryPickerProps) {
  const [filter, setFilter] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredArtists = filter
    ? artists.filter((a) => a.name.toLowerCase().includes(filter.toLowerCase()))
    : artists;

  return (
    <div className="lg:col-span-1" ref={dropdownRef}>
      <h2 className="text-sm font-medium text-gray-400 mb-2">Your Library</h2>
      {loading ? (
        <p className="text-gray-500 text-sm">Loading library...</p>
      ) : artists.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No artists in library. Connect Lidarr in Settings.
        </p>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Search library..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
          {dropdownOpen && (
            <div className="absolute z-10 w-full mt-1 max-h-64 overflow-y-auto space-y-1 bg-gray-800 rounded-lg border border-gray-700 p-2 shadow-lg">
              {filteredArtists.length === 0 ? (
                <p className="text-gray-500 text-sm px-3 py-2">No matches</p>
              ) : (
                filteredArtists.map((artist) => (
                  <button
                    key={artist.id}
                    onClick={() => {
                      onSelect(artist.name);
                      setFilter("");
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      selectedArtist === artist.name
                        ? "bg-indigo-600 text-white"
                        : "text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {artist.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
