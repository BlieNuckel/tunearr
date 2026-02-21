import { useMemo, useState } from "react";
import MonitorButton from "./MonitorButton";
import TrackList from "./TrackList";
import PurchaseLinksModal from "./PurchaseLinksModal";
import Spinner from "./Spinner";
import { CheckIcon, PlusIcon } from "@/components/icons";
import ImageWithShimmer from "./ImageWithShimmer";
import useLidarr from "../hooks/useLidarr";
import useReleaseTracks from "../hooks/useReleaseTracks";
import useAudioPreview from "../hooks/useAudioPreview";
import { MonitorState, ReleaseGroup } from "../types";

/** @returns {string} deterministic pastel HSL color derived from the input string */
function pastelColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 85%)`;
}

const mobileMonitorStyles: Record<MonitorState, string> = {
  idle: "bg-amber-300 hover:bg-amber-200 text-black",
  adding: "bg-amber-200 text-amber-700 cursor-wait",
  success: "bg-emerald-400 text-black cursor-default",
  already_monitored: "bg-gray-200 text-gray-500 cursor-default",
  error: "bg-rose-400 text-white",
};

interface ReleaseGroupCardProps {
  releaseGroup: ReleaseGroup;
  inLibrary?: boolean;
}

export default function ReleaseGroupCard({
  releaseGroup,
  inLibrary = false,
}: ReleaseGroupCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const artistName =
    releaseGroup["artist-credit"]?.[0]?.artist?.name || "Unknown Artist";
  const albumTitle = releaseGroup.title || "";
  const albumMbid = releaseGroup.id;
  const pastelBg = useMemo(() => pastelColorFromId(albumMbid), [albumMbid]);
  const year = releaseGroup["first-release-date"]?.slice(0, 4) || "";
  const coverUrl = `https://coverartarchive.org/release-group/${albumMbid}/front-500`;

  const { state, errorMsg, addToLidarr } = useLidarr();
  const {
    media,
    loading: tracksLoading,
    error: tracksError,
    fetchTracks,
  } = useReleaseTracks();
  const { toggle, stop, isTrackPlaying } = useAudioPreview();

  const effectiveState: MonitorState = inLibrary
    ? "already_monitored"
    : state === "idle" ||
        state === "adding" ||
        state === "success" ||
        state === "already_monitored" ||
        state === "error"
      ? state
      : "idle";
  const disabled =
    effectiveState === "adding" ||
    effectiveState === "success" ||
    effectiveState === "already_monitored";

  const loadTracksIfNeeded = () => {
    if (media.length === 0 && !tracksLoading) {
      fetchTracks(albumMbid, artistName);
    }
  };

  const handleMouseEnter = () => {
    setIsFlipped(true);
    loadTracksIfNeeded();
  };

  const handleMouseLeave = () => {
    setIsFlipped(false);
    stop();
  };

  const handleMobileCardClick = () => {
    if (!isExpanded) loadTracksIfNeeded();
    if (isExpanded) stop();
    setIsExpanded(!isExpanded);
  };

  const handleMonitorClick = () => {
    if (!albumTitle) {
      addToLidarr({ albumMbid });
      return;
    }

    if (effectiveState === "idle" || effectiveState === "error") {
      setIsModalOpen(true);
    }
  };

  const handleAddToLibrary = () => {
    addToLidarr({ albumMbid });
  };

  const [coverError, setCoverError] = useState(false);

  const coverImage = !coverError ? (
    <div className="absolute inset-0">
      <ImageWithShimmer
        src={coverUrl}
        alt={`${albumTitle} cover`}
        className="w-full h-full object-cover"
        onError={() => setCoverError(true)}
      />
    </div>
  ) : null;

  const monitorIcon =
    effectiveState === "adding" ? (
      <Spinner />
    ) : effectiveState === "success" ||
      effectiveState === "already_monitored" ? (
      <CheckIcon className="w-5 h-5" />
    ) : (
      <PlusIcon className="w-5 h-5" />
    );

  return (
    <>
      {/* Mobile: horizontal card with expand */}
      <div
        className="sm:hidden bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden"
        data-testid="release-group-card-mobile"
      >
        <div
          className="flex items-center cursor-pointer"
          onClick={handleMobileCardClick}
        >
          <div
            className="w-24 aspect-square flex-shrink-0 relative"
            style={{ backgroundColor: pastelBg }}
          >
            {coverImage}
          </div>
          <div className="flex-1 min-w-0 px-4 py-3">
            <div className="flex items-center gap-1.5">
              <h3 className="text-gray-900 dark:text-gray-100 font-semibold text-base truncate">
                {albumTitle}
              </h3>
              {inLibrary && (
                <span className="text-xs bg-amber-300 text-black px-1.5 py-0.5 rounded-full flex-shrink-0 border-2 border-black font-bold shadow-cartoon-sm whitespace-nowrap">
                  In Library
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm truncate">
              {artistName}
            </p>
            {year && (
              <p className="text-gray-400 dark:text-gray-500 text-xs">{year}</p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMonitorClick();
            }}
            disabled={disabled}
            className={`w-12 h-12 flex-shrink-0 mr-3 flex items-center justify-center rounded-lg border-2 border-black shadow-cartoon-sm ${mobileMonitorStyles[effectiveState]}`}
            data-testid="mobile-monitor-button"
            aria-label="Add to Lidarr"
          >
            {monitorIcon}
          </button>
        </div>
        <div
          className={`grid transition-[grid-template-rows] duration-300 ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          style={{
            transitionTimingFunction: "cubic-bezier(0.34, 1.3, 0.64, 1)",
          }}
        >
          <div className="overflow-hidden">
            <div
              className="border-t-2 border-black p-3 overlay-scrollbar max-h-64 overflow-y-auto"
              data-testid="mobile-tracklist"
            >
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

      {/* Desktop: flip card on hover */}
      <div
        className="hidden sm:block flip-card"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={`flip-card-inner ${isFlipped ? "flipped" : ""}`}>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden flip-card-face"
            data-testid="release-group-card"
          >
            <div
              className="aspect-square relative"
              style={{ backgroundColor: pastelBg }}
            >
              {coverImage}
            </div>

            <div className="p-3 border-t-2 border-black">
              <div className="flex items-center gap-1.5 mb-1">
                <h3 className="text-gray-900 dark:text-gray-100 font-semibold text-sm truncate">
                  {albumTitle}
                </h3>
                {inLibrary && (
                  <span className="text-xs bg-amber-300 text-black px-1.5 py-0.5 rounded-full flex-shrink-0 border-2 border-black font-bold shadow-cartoon-sm whitespace-nowrap">
                    In Library
                  </span>
                )}
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
                {artistName}
              </p>
              {year && (
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                  {year}
                </p>
              )}
            </div>
          </div>

          <div
            className="bg-white dark:bg-gray-800 rounded-xl border-2 border-black overflow-hidden flex flex-col p-4 flip-card-face flip-card-back shadow-cartoon-md-flip"
            data-testid="release-group-card-back"
          >
            <div className="flex-shrink-0">
              <h3 className="text-gray-900 dark:text-gray-100 font-semibold text-sm truncate">
                {albumTitle}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
                {artistName}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto mt-3 min-h-0 overlay-scrollbar">
              <TrackList
                media={media}
                loading={tracksLoading}
                error={tracksError}
                onTogglePreview={toggle}
                isTrackPlaying={isTrackPlaying}
              />
            </div>

            <div className="flex-shrink-0 mt-2">
              <MonitorButton
                state={effectiveState}
                onClick={handleMonitorClick}
                errorMsg={errorMsg ?? undefined}
              />
            </div>
          </div>
        </div>
      </div>

      <PurchaseLinksModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        artistName={artistName}
        albumTitle={albumTitle}
        albumMbid={albumMbid}
        onAddToLibrary={handleAddToLibrary}
      />
    </>
  );
}
