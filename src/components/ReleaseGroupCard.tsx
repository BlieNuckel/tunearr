import { useState } from "react";
import MonitorButton from "./MonitorButton";
import TrackList from "./TrackList";
import PurchaseLinksModal from "./PurchaseLinksModal";
import useLidarr from "../hooks/useLidarr";
import useReleaseTracks from "../hooks/useReleaseTracks";
import { ReleaseGroup } from "../types";

interface ReleaseGroupCardProps {
  releaseGroup: ReleaseGroup;
}

export default function ReleaseGroupCard({
  releaseGroup,
}: ReleaseGroupCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const artistName =
    releaseGroup["artist-credit"]?.[0]?.artist?.name || "Unknown Artist";
  const albumTitle = releaseGroup.title || "";
  const albumMbid = releaseGroup.id;
  const year = releaseGroup["first-release-date"]?.slice(0, 4) || "";
  const coverUrl = `https://coverartarchive.org/release-group/${albumMbid}/front-250`;

  const { state, errorMsg, addToLidarr } = useLidarr();
  const {
    media,
    loading: tracksLoading,
    error: tracksError,
    fetchTracks,
  } = useReleaseTracks();

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

  const handleToggle = () => {
    if (!expanded && media.length === 0 && !tracksLoading) {
      fetchTracks(albumMbid);
    }
    setExpanded(!expanded);
  };

  return (
    <>
      <div className="bg-white rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden hover:translate-y-[-2px] hover:shadow-cartoon-lg transition-all">
        <div className="flex gap-4 p-4">
          <img
            src={coverUrl}
            alt={`${albumTitle} cover`}
            className="w-24 h-24 rounded-lg object-cover bg-gray-100 flex-shrink-0 border-2 border-black"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-gray-900 font-semibold truncate">
              {albumTitle}
            </h3>
            <p className="text-gray-500 text-sm">{artistName}</p>
            {year && <p className="text-gray-400 text-xs mt-1">{year}</p>}
            <p className="text-gray-300 text-xs mt-1 truncate">{albumMbid}</p>
          </div>
          <div className="flex items-start gap-2">
            <MonitorButton
              state={state}
              onClick={handleClick}
              errorMsg={errorMsg ?? undefined}
            />
            <button
              onClick={handleToggle}
              className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors rounded"
            >
              <svg
                className={`w-5 h-5 transition-transform ${expanded ? "rotate-180" : ""}`}
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
          </div>
        </div>

        {expanded && (
          <div className="border-t-2 border-black px-4 py-3">
            <TrackList
              media={media}
              loading={tracksLoading}
              error={tracksError}
            />
          </div>
        )}
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
