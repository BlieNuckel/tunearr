import { useState, useEffect, useRef } from 'react';
import useArtistAlbums from '@/hooks/useArtistAlbums';
import ReleaseGroupCard from '@/components/ReleaseGroupCard';
import { ChevronDownIcon, MusicalNoteIcon } from '@/components/icons';

const DEAL_ROTATIONS = [-4, 3.5, -3, 4.5, -3.5, 3];
const EXIT_DURATION_MS = 150;

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
  const [animatingOut, setAnimatingOut] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { albums, loading, error, fetchAlbums } = useArtistAlbums();
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, []);

  const handleToggle = () => {
    if (animatingOut) return;

    if (expanded) {
      setAnimatingOut(true);
      exitTimeoutRef.current = setTimeout(() => {
        setAnimatingOut(false);
        setExpanded(false);
      }, EXIT_DURATION_MS);
    } else {
      if (albums.length === 0 && !loading) {
        fetchAlbums(name);
      }
      setExpanded(true);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden hover:translate-y-[-2px] hover:shadow-cartoon-lg transition-all">
        <button
          onClick={handleToggle}
          className="w-full flex items-center gap-3 p-3 text-left hover:bg-amber-50 transition-colors"
        >
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-12 h-12 rounded-lg object-cover bg-gray-100 flex-shrink-0 border-2 border-black"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-amber-100 flex-shrink-0 flex items-center justify-center border-2 border-black">
              <MusicalNoteIcon className="w-6 h-6 text-amber-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-gray-900 font-medium truncate">{name}</h3>
              {inLibrary && (
                <span className="text-xs bg-amber-300 text-black px-1.5 py-0.5 rounded-full flex-shrink-0 border-2 border-black font-bold shadow-cartoon-sm">
                  In Library
                </span>
              )}
            </div>
            {match !== undefined && (
              <p className="text-gray-400 text-xs">
                {Math.round(match * 100)}% match
              </p>
            )}
          </div>
          <ChevronDownIcon
            className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {loading && (
            <p className="text-gray-500 text-sm">Loading albums...</p>
          )}
          {error && <p className="text-rose-500 text-sm">{error}</p>}
          {!loading && !error && albums.length === 0 && (
            <p className="text-gray-400 text-sm">No albums found.</p>
          )}
          {albums.map((rg, index) => (
            <div
              key={rg.id}
              className={animatingOut ? "cascade-deal-out" : "cascade-deal-in"}
              style={
                {
                  "--deal-index": index,
                  "--deal-rotate": `${DEAL_ROTATIONS[index % DEAL_ROTATIONS.length]}deg`,
                } as React.CSSProperties
              }
            >
              <ReleaseGroupCard releaseGroup={rg} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
