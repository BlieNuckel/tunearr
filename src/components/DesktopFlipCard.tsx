import type { MonitorState, Medium } from "../types";
import MonitorButton from "./MonitorButton";
import TrackList from "./TrackList";
import ImageWithShimmer from "./ImageWithShimmer";

interface DesktopFlipCardProps {
  albumTitle: string;
  artistName: string;
  year: string;
  pastelBg: string;
  coverUrl: string;
  coverError: boolean;
  onCoverError: () => void;
  inLibrary: boolean;
  isFlipped: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  effectiveState: MonitorState;
  errorMsg: string | undefined;
  onMonitorClick: () => void;
  media: Medium[];
  tracksLoading: boolean;
  tracksError: string | null;
  onTogglePreview: (url: string) => void;
  isTrackPlaying: (url: string) => boolean;
}

export default function DesktopFlipCard({
  albumTitle,
  artistName,
  year,
  pastelBg,
  coverUrl,
  coverError,
  onCoverError,
  inLibrary,
  isFlipped,
  onMouseEnter,
  onMouseLeave,
  effectiveState,
  errorMsg,
  onMonitorClick,
  media,
  tracksLoading,
  tracksError,
  onTogglePreview,
  isTrackPlaying,
}: DesktopFlipCardProps) {
  return (
    <div
      className="hidden sm:block flip-card"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
              onTogglePreview={onTogglePreview}
              isTrackPlaying={isTrackPlaying}
            />
          </div>

          <div className="flex-shrink-0 mt-2">
            <MonitorButton
              state={effectiveState}
              onClick={onMonitorClick}
              errorMsg={errorMsg}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
