import { useState } from "react";
import type { PromotedAlbumData } from "@/hooks/usePromotedAlbum";
import type { MonitorState } from "@/types";
import MonitorButton from "@/components/MonitorButton";
import PurchaseLinksModal from "@/components/PurchaseLinksModal";
import { RefreshIcon } from "@/components/icons";
import useLidarr from "@/hooks/useLidarr";
import ImageWithShimmer from "@/components/ImageWithShimmer";
import Skeleton from "@/components/Skeleton";

/** @returns deterministic pastel HSL color derived from the input string */
function pastelColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 85%)`;
}

interface PromotedAlbumProps {
  data: PromotedAlbumData | null;
  loading: boolean;
  onRefresh: () => void;
}

export default function PromotedAlbum({
  data,
  loading,
  onRefresh,
}: PromotedAlbumProps) {
  const [coverError, setCoverError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { state, errorMsg, addToLidarr } = useLidarr();

  const album = data?.album;
  const tag = data?.tag;
  const inLibrary = data?.inLibrary ?? false;
  const pastelBg = album ? pastelColorFromId(album.mbid) : "hsl(200, 70%, 85%)";

  const effectiveState: MonitorState = inLibrary
    ? "already_monitored"
    : state === "idle" ||
        state === "adding" ||
        state === "success" ||
        state === "already_monitored" ||
        state === "error"
      ? state
      : "idle";

  const handleMonitorClick = () => {
    if (effectiveState === "idle" || effectiveState === "error") {
      setIsModalOpen(true);
    }
  };

  const handleAddToLibrary = () => {
    if (!album) return;
    addToLidarr({ albumMbid: album.mbid });
  };

  const handleRefresh = () => {
    if (loading) return; // Prevent refresh while already loading
    setIsAnimating(true);
    setTimeout(() => {
      onRefresh();
      setCoverError(false);
      setTimeout(() => setIsAnimating(false), 50);
    }, 300);
  };

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Recommended for you
          </h2>
          <button
            onClick={handleRefresh}
            disabled={isAnimating || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 text-xs font-bold bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Shuffle recommendation"
          >
            <RefreshIcon
              className={`w-4 h-4 ${isAnimating || loading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Shuffle</span>
          </button>
        </div>

        <div
          className={`bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden flex flex-col sm:flex-row transition-all duration-300 ${
            isAnimating
              ? "opacity-0 -translate-x-4 scale-95"
              : "opacity-100 translate-x-0 scale-100"
          }`}
        >
          <div
            className="w-full sm:w-48 aspect-square sm:aspect-auto sm:h-48 flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: pastelBg }}
          >
            {loading ? (
              <Skeleton className="w-full h-full rounded-none" />
            ) : (
              !coverError &&
              album && (
                <ImageWithShimmer
                  src={album.coverUrl}
                  alt={`${album.name} cover`}
                  className="w-full h-full object-cover"
                  onError={() => setCoverError(true)}
                />
              )
            )}
          </div>

          <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-5 w-32 rounded-full mt-2" />
              </div>
            ) : album ? (
              <>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                    {album.name}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm truncate">
                    {album.artistName}
                  </p>
                  {tag && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-medium rounded-full border border-violet-200 dark:border-violet-700">
                      Because you listen to {tag}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex justify-end">
                  <MonitorButton
                    state={effectiveState}
                    onClick={handleMonitorClick}
                    errorMsg={errorMsg ?? undefined}
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {album && (
        <PurchaseLinksModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          artistName={album.artistName}
          albumTitle={album.name}
          albumMbid={album.mbid}
          onAddToLibrary={handleAddToLibrary}
        />
      )}
    </>
  );
}
