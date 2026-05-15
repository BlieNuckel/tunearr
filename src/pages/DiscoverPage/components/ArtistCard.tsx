import { useState, useEffect, useRef } from "react";
import useArtistAlbums from "@/hooks/useArtistAlbums";
import useHaptics from "@/hooks/useHaptics";
import ReleaseGroupCard from "@/components/ReleaseGroupCard";
import { ChevronDownIcon, MusicalNoteIcon } from "@/components/icons";
import ImageWithShimmer from "@/components/ImageWithShimmer";
import Skeleton from "@/components/Skeleton";
import FollowArtistButton from "@/components/FollowArtistButton";
import type { ReleaseGroup } from "@/types";

const DEAL_ROTATIONS = [-4, 3.5, -3, 4.5, -3.5, 3];
const EXIT_DURATION_MS = 150;

function splitAlbumsByCredit(
  albums: ReleaseGroup[],
  artistName: string
): { primary: ReleaseGroup[]; featured: ReleaseGroup[] } {
  const normalised = artistName.toLowerCase();
  const primary: ReleaseGroup[] = [];
  const featured: ReleaseGroup[] = [];

  for (const album of albums) {
    const credit = album["artist-credit"]?.[0];
    if (credit && credit.artist.name.toLowerCase() === normalised) {
      primary.push(album);
    } else {
      featured.push(album);
    }
  }

  return { primary, featured };
}

interface ArtistCardProps {
  name: string;
  mbid?: string;
  imageUrl?: string;
  /** 0-1 similarity score, shown as percentage */
  match?: number;
  inLibrary?: boolean;
  isAlbumInLibrary: (albumMbid: string) => boolean;
}

export default function ArtistCard({
  name,
  mbid,
  imageUrl,
  match,
  inLibrary,
  isAlbumInLibrary,
}: ArtistCardProps) {
  const haptics = useHaptics();
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
    haptics.light();

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

  const { primary, featured } = splitAlbumsByCredit(albums, name);

  const renderAlbumGrid = (items: ReleaseGroup[], dealIndexOffset: number) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
      {items.map((rg, index) => (
        <div
          key={rg.id}
          className={animatingOut ? "cascade-deal-out" : "cascade-deal-in"}
          style={
            {
              "--deal-index": dealIndexOffset + index,
              "--deal-rotate": `${DEAL_ROTATIONS[(dealIndexOffset + index) % DEAL_ROTATIONS.length]}deg`,
            } as React.CSSProperties
          }
        >
          <ReleaseGroupCard
            releaseGroup={rg}
            inLibrary={isAlbumInLibrary(rg.id)}
          />
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden hover:translate-y-[-2px] hover:shadow-cartoon-lg transition-all">
        <button
          onClick={handleToggle}
          className="w-full flex items-center gap-3 p-3 text-left hover:bg-amber-50 dark:hover:bg-gray-700 transition-colors"
        >
          {imageUrl && !imageError ? (
            <ImageWithShimmer
              src={imageUrl}
              alt={name}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border-2 border-black"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center border-2 border-black">
              <MusicalNoteIcon className="w-6 h-6 text-amber-400 dark:text-amber-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-gray-900 dark:text-gray-100 font-medium truncate">
                {name}
              </h3>
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
          {mbid && (
            <FollowArtistButton
              artistMbid={mbid}
              artistName={name}
              size="sm"
              showLabel={false}
              className="flex-shrink-0"
            />
          )}
          <ChevronDownIcon
            className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {expanded && (
        <>
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i}>
                  <div className="sm:hidden bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-sm overflow-hidden">
                    <div className="flex items-center">
                      <Skeleton className="w-24 aspect-square flex-shrink-0 rounded-none" />
                      <div className="flex-1 min-w-0 px-4 py-3 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                      <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0 mr-3" />
                    </div>
                  </div>
                  <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-sm overflow-hidden">
                    <Skeleton className="aspect-square rounded-none" />
                    <div className="p-3 border-t-2 border-black space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && <p className="text-rose-500 text-sm">{error}</p>}
          {!loading && !error && albums.length === 0 && (
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              No albums found.
            </p>
          )}
          {!loading && primary.length > 0 && renderAlbumGrid(primary, 0)}
          {!loading && featured.length > 0 && (
            <>
              <h4 className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wide">
                Featured
              </h4>
              {renderAlbumGrid(featured, primary.length)}
            </>
          )}
        </>
      )}
    </>
  );
}
