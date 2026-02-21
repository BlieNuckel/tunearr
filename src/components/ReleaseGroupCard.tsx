import { useMemo, useState } from "react";
import PurchaseLinksModal from "./PurchaseLinksModal";
import MobileReleaseCard from "./MobileReleaseCard";
import DesktopFlipCard from "./DesktopFlipCard";
import Spinner from "./Spinner";
import { CheckIcon, PlusIcon } from "@/components/icons";
import useLidarr from "../hooks/useLidarr";
import useReleaseTracks from "../hooks/useReleaseTracks";
import useAudioPreview from "../hooks/useAudioPreview";
import { MonitorState, ReleaseGroup } from "../types";
import { pastelColorFromId } from "../utils/pastelColor";

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
  const [coverError, setCoverError] = useState(false);

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

  const handleMonitorClick = () => {
    if (!albumTitle) {
      addToLidarr({ albumMbid });
      return;
    }
    if (effectiveState === "idle" || effectiveState === "error") {
      setIsModalOpen(true);
    }
  };

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
      <MobileReleaseCard
        albumTitle={albumTitle}
        artistName={artistName}
        year={year}
        pastelBg={pastelBg}
        coverUrl={coverUrl}
        coverError={coverError}
        onCoverError={() => setCoverError(true)}
        inLibrary={inLibrary}
        isExpanded={isExpanded}
        onCardClick={() => {
          if (!isExpanded) loadTracksIfNeeded();
          if (isExpanded) stop();
          setIsExpanded(!isExpanded);
        }}
        onMonitorClick={handleMonitorClick}
        monitorDisabled={disabled}
        monitorIcon={monitorIcon}
        effectiveState={effectiveState}
        media={media}
        tracksLoading={tracksLoading}
        tracksError={tracksError}
        onTogglePreview={toggle}
        isTrackPlaying={isTrackPlaying}
      />

      <DesktopFlipCard
        albumTitle={albumTitle}
        artistName={artistName}
        year={year}
        pastelBg={pastelBg}
        coverUrl={coverUrl}
        coverError={coverError}
        onCoverError={() => setCoverError(true)}
        inLibrary={inLibrary}
        isFlipped={isFlipped}
        onMouseEnter={() => {
          setIsFlipped(true);
          loadTracksIfNeeded();
        }}
        onMouseLeave={() => {
          setIsFlipped(false);
          stop();
        }}
        effectiveState={effectiveState}
        errorMsg={errorMsg ?? undefined}
        onMonitorClick={handleMonitorClick}
        media={media}
        tracksLoading={tracksLoading}
        tracksError={tracksError}
        onTogglePreview={toggle}
        isTrackPlaying={isTrackPlaying}
      />

      <PurchaseLinksModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        artistName={artistName}
        albumTitle={albumTitle}
        albumMbid={albumMbid}
        onAddToLibrary={() => addToLidarr({ albumMbid })}
      />
    </>
  );
}
