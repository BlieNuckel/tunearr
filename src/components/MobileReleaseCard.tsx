import type { ReactNode } from "react";
import type { MonitorState, Medium } from "../types";
import TrackList from "./TrackList";
import ImageWithShimmer from "./ImageWithShimmer";

interface MobileReleaseCardProps {
  albumTitle: string;
  artistName: string;
  year: string;
  pastelBg: string;
  coverUrl: string;
  coverError: boolean;
  onCoverError: () => void;
  inLibrary: boolean;
  isExpanded: boolean;
  onCardClick: () => void;
  onMonitorClick: () => void;
  monitorDisabled: boolean;
  monitorIcon: ReactNode;
  effectiveState: MonitorState;
  media: Medium[];
  tracksLoading: boolean;
  tracksError: string | null;
  onTogglePreview: (url: string) => void;
  isTrackPlaying: (url: string) => boolean;
}

const mobileMonitorStyles: Record<MonitorState, string> = {
  idle: "bg-amber-300 hover:bg-amber-200 text-black",
  adding: "bg-amber-200 text-amber-700 cursor-wait",
  success: "bg-emerald-400 text-black cursor-default",
  already_monitored: "bg-gray-200 text-gray-500 cursor-default",
  error: "bg-rose-400 text-white",
};

export default function MobileReleaseCard({
  albumTitle,
  artistName,
  year,
  pastelBg,
  coverUrl,
  coverError,
  onCoverError,
  inLibrary,
  isExpanded,
  onCardClick,
  onMonitorClick,
  monitorDisabled,
  monitorIcon,
  effectiveState,
  media,
  tracksLoading,
  tracksError,
  onTogglePreview,
  isTrackPlaying,
}: MobileReleaseCardProps) {
  return (
    <div
      className="sm:hidden bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden"
      data-testid="release-group-card-mobile"
    >
      <div
        className="flex items-center cursor-pointer"
        onClick={onCardClick}
      >
        <div
          className="w-24 aspect-square flex-shrink-0 relative"
          style={{ backgroundColor: pastelBg }}
        >
          {!coverError && (
            <div className="absolute inset-0">
              <ImageWithShimmer
                src={coverUrl}
                alt={`${albumTitle} cover`}
                className="w-full h-full object-cover"
                onError={onCoverError}
              />
            </div>
          )}
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
            onMonitorClick();
          }}
          disabled={monitorDisabled}
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
              onTogglePreview={onTogglePreview}
              isTrackPlaying={isTrackPlaying}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
