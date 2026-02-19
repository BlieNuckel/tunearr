import { useMemo, useRef, useState } from "react";
import MonitorButton from "./MonitorButton";
import TrackList from "./TrackList";
import PurchaseLinksModal from "./PurchaseLinksModal";
import useLidarr from "../hooks/useLidarr";
import useReleaseTracks from "../hooks/useReleaseTracks";
import { ReleaseGroup } from "../types";

/** @returns {string} deterministic pastel HSL color derived from the input string */
function pastelColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 85%)`;
}

interface ReleaseGroupCardProps {
  releaseGroup: ReleaseGroup;
}

export default function ReleaseGroupCard({
  releaseGroup,
}: ReleaseGroupCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [detailRect, setDetailRect] = useState<DOMRect | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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

  const loadTracksIfNeeded = () => {
    if (media.length === 0 && !tracksLoading) {
      fetchTracks(albumMbid);
    }
  };

  const handleMouseEnter = () => {
    setIsFlipped(true);
    loadTracksIfNeeded();
  };

  const handleMouseLeave = () => {
    setIsFlipped(false);
  };

  const handleCardClick = () => {
    if (cardRef.current) {
      setDetailRect(cardRef.current.getBoundingClientRect());
    }
    setIsFlipped(false);
    loadTracksIfNeeded();
  };

  const handleMonitorClick = () => {
    if (!albumTitle) {
      addToLidarr({ albumMbid });
      return;
    }

    if (state === "idle" || state === "error") {
      setIsModalOpen(true);
    }
  };

  const handleAddToLibrary = () => {
    addToLidarr({ albumMbid });
  };

  const coverImage = (
    <img
      src={coverUrl}
      alt={`${albumTitle} cover`}
      className="w-full h-full object-cover text-transparent"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );

  const detailStyle = detailRect
    ? (() => {
        const modalW = Math.min(384, window.innerWidth - 32);
        const cardCenterX = detailRect.left + detailRect.width / 2;
        const cardCenterY = detailRect.top + detailRect.height / 2;
        return {
          "--from-x": `${cardCenterX - window.innerWidth / 2}px`,
          "--from-y": `${cardCenterY - window.innerHeight / 2}px`,
          "--from-scale": `${detailRect.width / modalW}`,
        } as React.CSSProperties;
      })()
    : undefined;

  return (
    <>
      <div
        ref={cardRef}
        className="flip-card cursor-pointer"
        onClick={handleCardClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={`flip-card-inner ${isFlipped ? "flipped" : ""}`}>
          <div
            className="bg-white rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden flip-card-face"
            data-testid="release-group-card"
          >
            <div
              className="aspect-square"
              style={{ backgroundColor: pastelBg }}
            >
              {coverImage}
            </div>

            <div className="p-3 border-t-2 border-black">
              <h3 className="text-gray-900 font-semibold text-sm truncate">
                {albumTitle}
              </h3>
              <p className="text-gray-500 text-xs truncate">{artistName}</p>
              {year && <p className="text-gray-400 text-xs mt-0.5">{year}</p>}
            </div>
          </div>

          <div
            className="bg-white rounded-xl border-2 border-black overflow-hidden flex flex-col p-4 flip-card-face flip-card-back shadow-cartoon-md-flip"
            data-testid="release-group-card-back"
          >
            <div className="flex-shrink-0">
              <h3 className="text-gray-900 font-semibold text-sm truncate">
                {albumTitle}
              </h3>
              <p className="text-gray-500 text-xs truncate">{artistName}</p>
            </div>

            <div className="flex-1 overflow-y-auto mt-3 min-h-0 overlay-scrollbar">
              <TrackList
                media={media}
                loading={tracksLoading}
                error={tracksError}
              />
            </div>

            <div
              className="flex-shrink-0 mt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <MonitorButton
                state={state}
                onClick={handleMonitorClick}
                errorMsg={errorMsg ?? undefined}
              />
            </div>
          </div>
        </div>
      </div>

      {detailRect && (
        <div
          data-testid="detail-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 detail-perspective"
          onClick={() => setDetailRect(null)}
        >
          <div className="absolute inset-0 bg-black/40 detail-backdrop" />

          <div
            className="detail-flip w-full max-w-sm"
            style={detailStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Front face — card appearance visible during first half of flip */}
            <div className="detail-front bg-white rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden">
              <div
                className="aspect-square"
                style={{ backgroundColor: pastelBg }}
              >
                {coverImage}
              </div>
              <div className="p-3 border-t-2 border-black">
                <h3 className="text-gray-900 font-semibold text-sm truncate">
                  {albumTitle}
                </h3>
                <p className="text-gray-500 text-xs truncate">{artistName}</p>
                {year && (
                  <p className="text-gray-400 text-xs mt-0.5">{year}</p>
                )}
              </div>
            </div>

            {/* Back face — detail content visible after flip completes */}
            <div className="detail-back bg-white rounded-xl border-4 border-black shadow-cartoon-lg overflow-hidden flex flex-col max-h-[80vh]">
              <button
                data-testid="detail-close"
                onClick={() => setDetailRect(null)}
                className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-lg border-2 border-black bg-white shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
              >
                <span className="text-lg font-bold leading-none">&times;</span>
              </button>

              <div
                className="h-48 flex-shrink-0"
                style={{ backgroundColor: pastelBg }}
              >
                {coverImage}
              </div>

              <div className="p-4 border-t-2 border-black flex-shrink-0">
                <h3 className="text-gray-900 font-bold text-lg">
                  {albumTitle}
                </h3>
                <p className="text-gray-500 text-sm">{artistName}</p>
                {year && (
                  <p className="text-gray-400 text-xs mt-0.5">{year}</p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-4 min-h-0">
                <TrackList
                  media={media}
                  loading={tracksLoading}
                  error={tracksError}
                />
              </div>

              <div className="p-4 border-t-2 border-black flex-shrink-0">
                <MonitorButton
                  state={state}
                  onClick={handleMonitorClick}
                  errorMsg={errorMsg ?? undefined}
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
