import { useState } from "react";
import useArtistAlbums from "@/hooks/useArtistAlbums";
import ReleaseGroupCard from "@/components/ReleaseGroupCard";

interface ArtistCardProps {
  name: string;
  imageUrl?: string;
  /** 0-1 similarity score, shown as percentage */
  match?: number;
  inLibrary?: boolean;
}

export default function ArtistCard({
  name,
  imageUrl,
  match,
  inLibrary,
}: ArtistCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { albums, loading, error, fetchAlbums } = useArtistAlbums();

  const handleToggle = () => {
    if (!expanded && albums.length === 0 && !loading) {
      fetchAlbums(name);
    }
    setExpanded(!expanded);
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-750 transition-colors"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-12 h-12 rounded object-cover bg-gray-700 flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-12 h-12 rounded bg-gray-700 flex-shrink-0 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-gray-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium truncate">{name}</h3>
            {inLibrary && (
              <span className="text-xs bg-indigo-900/50 text-indigo-400 px-1.5 py-0.5 rounded flex-shrink-0">
                In Library
              </span>
            )}
          </div>
          {match !== undefined && (
            <p className="text-gray-500 text-xs">
              {Math.round(match * 100)}% match
            </p>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-700 p-3 space-y-2">
          {loading && (
            <p className="text-gray-400 text-sm">Loading albums...</p>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {!loading && !error && albums.length === 0 && (
            <p className="text-gray-500 text-sm">No albums found.</p>
          )}
          {albums.map((rg) => (
            <ReleaseGroupCard key={rg.id} releaseGroup={rg} />
          ))}
        </div>
      )}
    </div>
  );
}
