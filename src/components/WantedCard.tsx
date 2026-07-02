import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ImageWithShimmer from "./ImageWithShimmer";
import MonitorButton from "./MonitorButton";
import OptionSelect from "./OptionSelect";
import AlbumActionModals from "./AlbumActionModals";
import useHaptics from "../hooks/useHaptics";
import useAlbumActions from "../hooks/useAlbumActions";
import { pastelColorFromId } from "../utils/color";
import type { ReleaseGroup } from "../types";

interface WantedCardProps {
  releaseGroup: ReleaseGroup;
  inLibrary?: boolean;
  initialWanted?: boolean;
  onRemovedFromWanted?: (albumMbid: string) => void | Promise<void>;
}

export default function WantedCard({
  releaseGroup,
  inLibrary = false,
  initialWanted = false,
  onRemovedFromWanted,
}: WantedCardProps) {
  const navigate = useNavigate();
  const haptics = useHaptics();
  const actions = useAlbumActions({
    releaseGroup,
    inLibrary,
    initialWanted,
    onRemovedFromWanted,
  });

  const artistName =
    releaseGroup["artist-credit"]?.[0]?.artist?.name || "Unknown Artist";
  const albumTitle = releaseGroup.title || "";
  const albumMbid = releaseGroup.id;
  const pastelBg = useMemo(() => pastelColorFromId(albumMbid), [albumMbid]);
  const coverUrl = `https://coverartarchive.org/release-group/${albumMbid}/front-500`;

  const [coverError, setCoverError] = useState(false);

  const handleNavigate = () => {
    haptics.light();
    navigate(`/album/${albumMbid}`);
  };

  return (
    <>
      <div
        className="flex items-center bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden"
        data-testid="wanted-card"
      >
        <button
          type="button"
          onClick={handleNavigate}
          className="flex flex-1 min-w-0 items-center text-left cursor-pointer"
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
                  onError={() => setCoverError(true)}
                />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 px-4 py-3">
            <h3 className="text-gray-900 dark:text-gray-100 font-semibold text-base truncate">
              {albumTitle}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm truncate">
              {artistName}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0 mr-3">
          <OptionSelect options={actions.options} title={albumTitle} />
          <MonitorButton
            state={actions.effectiveState}
            onClick={actions.handleMonitorClick}
            errorMsg={actions.errorMsg ?? undefined}
          />
        </div>
      </div>

      <AlbumActionModals actions={actions} />
    </>
  );
}
