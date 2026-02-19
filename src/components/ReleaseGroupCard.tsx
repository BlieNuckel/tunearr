import { useMemo, useState } from "react";
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

  const handleMouseEnter = () => {
    if (media.length === 0 && !tracksLoading) {
      fetchTracks(albumMbid);
    }
  };

  const handleClick = () => {
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

  return (
    <>
      <div
        className="group bg-white rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden relative"
        onMouseEnter={handleMouseEnter}
        data-testid="release-group-card"
      >
        <div className="aspect-square" style={{ backgroundColor: pastelBg }}>
          <img
            src={coverUrl}
            alt={`${albumTitle} cover`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        <div className="p-3 border-t-2 border-black">
          <h3 className="text-gray-900 font-semibold text-sm truncate">
            {albumTitle}
          </h3>
          <p className="text-gray-500 text-xs truncate">{artistName}</p>
          {year && <p className="text-gray-400 text-xs mt-0.5">{year}</p>}
        </div>

        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col p-4">
          <div className="flex-shrink-0">
            <h3 className="text-gray-900 font-semibold text-sm truncate">
              {albumTitle}
            </h3>
            <p className="text-gray-500 text-xs">{artistName}</p>
          </div>

          <div className="flex-1 overflow-y-auto mt-3 min-h-0 overlay-scrollbar">
            <TrackList
              media={media}
              loading={tracksLoading}
              error={tracksError}
            />
          </div>

          <div className="flex-shrink-0 mt-2">
            <MonitorButton
              state={state}
              onClick={handleClick}
              errorMsg={errorMsg ?? undefined}
            />
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
