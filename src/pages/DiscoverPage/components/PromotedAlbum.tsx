import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { PromotedAlbumData } from "@/hooks/usePromotedAlbum";
import type { MonitorState } from "@/types";
import MonitorButton from "@/components/MonitorButton";
import PurchaseLinksModal from "@/components/PurchaseLinksModal";
import RecommendationTraceModal from "./RecommendationTraceModal";
import {
  RefreshIcon,
  ChevronDownIcon,
  MusicalNoteIcon,
} from "@/components/icons";
import useLidarr from "@/hooks/useLidarr";
import useReleaseTracks from "@/hooks/useReleaseTracks";
import useAudioPreview from "@/hooks/useAudioPreview";
import ImageWithShimmer from "@/components/ImageWithShimmer";
import Skeleton from "@/components/Skeleton";
import TrackList from "@/components/TrackList";

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
  const [isTraceOpen, setIsTraceOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isTracksOpen, setIsTracksOpen] = useState(false);
  const [fetchedMbid, setFetchedMbid] = useState<string | null>(null);
  const [expandHeight, setExpandHeight] = useState(0);
  const expandContentRef = useRef<HTMLDivElement>(null);

  const { state, errorMsg, addToLidarr, reset: resetLidarr } = useLidarr();
  const {
    media,
    loading: tracksLoading,
    error: tracksError,
    fetchTracks,
    reset: resetTracks,
  } = useReleaseTracks();
  const { toggle, stop, isTrackPlaying } = useAudioPreview();

  const album = data?.album;
  const tag = data?.tag;
  const inLibrary = data?.inLibrary ?? false;
  const pastelBg = album ? pastelColorFromId(album.mbid) : "hsl(200, 70%, 85%)";

  useEffect(() => {
    const el = expandContentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setExpandHeight(el.offsetHeight);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
    if (loading) return;
    setIsAnimating(true);
    resetLidarr();
    setIsTracksOpen(false);
    setFetchedMbid(null);
    resetTracks();
    stop();
    setTimeout(() => {
      onRefresh();
      setCoverError(false);
      setTimeout(() => setIsAnimating(false), 50);
    }, 300);
  };

  const handleTracksToggle = () => {
    if (
      !isTracksOpen &&
      album &&
      fetchedMbid !== album.mbid &&
      !tracksLoading
    ) {
      fetchTracks(album.mbid, album.artistName);
      setFetchedMbid(album.mbid);
    }
    if (isTracksOpen) stop();
    setIsTracksOpen(!isTracksOpen);
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
          className={`bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden transition-all duration-300 ${
            isAnimating
              ? "opacity-0 -translate-x-4 scale-95"
              : "opacity-100 translate-x-0 scale-100"
          }`}
        >
          <div className="flex flex-col sm:flex-row">
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
                      <Link
                        to={`/search?q=${encodeURIComponent(album.artistName)}&searchType=artist`}
                        className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                      >
                        {album.artistName}
                      </Link>
                      {album.year && (
                        <span className="ml-1.5">· {album.year}</span>
                      )}
                    </p>
                    {tag && (
                      <button
                        onClick={() => setIsTraceOpen(true)}
                        className="inline-block mt-2 px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-medium rounded-full border border-violet-200 dark:border-violet-700 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors cursor-pointer"
                      >
                        Because you listen to {tag}
                      </button>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={handleTracksToggle}
                      className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                      aria-label={
                        isTracksOpen ? "Hide tracks" : "Preview tracks"
                      }
                    >
                      <MusicalNoteIcon className="w-3.5 h-3.5" />
                      <span>{isTracksOpen ? "Hide tracks" : "Preview"}</span>
                      <ChevronDownIcon
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isTracksOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
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

          <div
            className="overflow-hidden transition-[height] duration-300"
            style={{
              height: isTracksOpen ? expandHeight : 0,
              transitionTimingFunction: "cubic-bezier(0.34, 1.3, 0.64, 1)",
            }}
            data-testid="tracks-expand"
          >
            <div ref={expandContentRef}>
              <div className="border-t-2 border-black px-4 py-3 overlay-scrollbar max-h-64 overflow-y-auto">
                <TrackList
                  media={media}
                  loading={tracksLoading}
                  error={tracksError}
                  onTogglePreview={toggle}
                  isTrackPlaying={isTrackPlaying}
                />
              </div>
            </div>
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

      {data?.trace && album && (
        <RecommendationTraceModal
          isOpen={isTraceOpen}
          onClose={() => setIsTraceOpen(false)}
          trace={data.trace}
          albumName={album.name}
          artistName={album.artistName}
        />
      )}
    </>
  );
}
