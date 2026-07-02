import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { hasPermission, Permission } from "@shared/permissions";
import { getMonitorState } from "../utils/monitorState";
import useLidarr from "./useLidarr";
import useWanted from "./useWanted";
import usePurchase from "./usePurchase";
import useFollowedArtists from "./useFollowedArtists";
import useHaptics from "./useHaptics";
import type { Option } from "../components/OptionSelect";
import type { MonitorState, ReleaseGroup } from "../types";

interface UseAlbumActionsParams {
  releaseGroup: ReleaseGroup;
  inLibrary?: boolean;
  initialWanted?: boolean;
  onRemovedFromWanted?: (albumMbid: string) => void | Promise<void>;
}

export interface AlbumActions {
  albumMbid: string;
  albumTitle: string;
  artistName: string;
  effectiveState: MonitorState;
  errorMsg: string | null;
  disabled: boolean;
  options: Option[];
  menuOptions: Option[];
  isWanted: boolean;
  wantedPending: boolean;
  toggleWanted: () => void;
  handleMonitorClick: () => void;
  isLinksModalOpen: boolean;
  closeLinksModal: () => void;
  isPriceModalOpen: boolean;
  closePriceModal: () => void;
  handleAddToLibrary: () => void;
  handleRecordPurchase: (price: number, currency: string) => void;
  recordingPurchase: boolean;
}

export default function useAlbumActions({
  releaseGroup,
  inLibrary = false,
  initialWanted = false,
  onRemovedFromWanted,
}: UseAlbumActionsParams): AlbumActions {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canImport =
    user !== null && hasPermission(user.permissions, Permission.IMPORT);

  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);

  const artistCredit = releaseGroup["artist-credit"]?.[0]?.artist;
  const artistName = artistCredit?.name || "Unknown Artist";
  const artistMbid = artistCredit?.id;
  const albumTitle = releaseGroup.title || "";
  const albumMbid = releaseGroup.id;

  const haptics = useHaptics();
  const { state, errorMsg, requestAlbum } = useLidarr();
  const {
    state: wantedState,
    addToWanted,
    removeFromWanted,
  } = useWanted(initialWanted);
  const { state: purchaseState, record: recordPurchase } = usePurchase();
  const { isFollowing, follow, unfollow } = useFollowedArtists();

  const effectiveState = getMonitorState(state, inLibrary);
  const disabled =
    effectiveState === "adding" ||
    effectiveState === "success" ||
    effectiveState === "already_monitored";

  const handleMonitorClick = () => {
    haptics.medium();
    if (!albumTitle) {
      requestAlbum({ albumMbid });
      return;
    }
    if (effectiveState === "idle" || effectiveState === "error") {
      setIsLinksModalOpen(true);
    }
  };

  const handleRemoveFromWanted = async () => {
    if (onRemovedFromWanted) {
      await onRemovedFromWanted(albumMbid);
    } else {
      await removeFromWanted(albumMbid);
    }
  };

  const isWanted = wantedState === "wanted";
  const wantedPending = wantedState === "adding" || wantedState === "removing";
  const isPurchased = purchaseState === "purchased";
  const following = artistMbid ? isFollowing(artistMbid) : false;

  const toggleWanted = () => {
    if (isWanted) {
      void handleRemoveFromWanted();
    } else {
      void addToWanted(albumMbid);
    }
  };

  const wantedOption: Option = isWanted
    ? { label: "Remove from wanted", onClick: handleRemoveFromWanted }
    : { label: "Add to wanted", onClick: () => addToWanted(albumMbid) };

  const menuOptions: Option[] = [
    ...(isPurchased
      ? []
      : [
          {
            label: "Mark as purchased",
            onClick: () => setIsPriceModalOpen(true),
          },
        ]),
    ...(canImport
      ? [
          {
            label: "Upload files",
            onClick: () => navigate(`/library/upload?mbid=${albumMbid}`),
          },
        ]
      : []),
    ...(artistMbid
      ? [
          following
            ? {
                label: "Unfollow artist",
                onClick: () => {
                  void unfollow(artistMbid);
                },
              }
            : {
                label: "Follow artist",
                onClick: () => {
                  void follow(artistMbid, artistName);
                },
              },
        ]
      : []),
  ];

  const options: Option[] = [wantedOption, ...menuOptions];

  return {
    albumMbid,
    albumTitle,
    artistName,
    effectiveState,
    errorMsg,
    disabled,
    options,
    menuOptions,
    isWanted,
    wantedPending,
    toggleWanted,
    handleMonitorClick,
    isLinksModalOpen,
    closeLinksModal: () => setIsLinksModalOpen(false),
    isPriceModalOpen,
    closePriceModal: () => setIsPriceModalOpen(false),
    handleAddToLibrary: () => requestAlbum({ albumMbid }),
    handleRecordPurchase: (price, currency) =>
      recordPurchase(albumMbid, price, currency),
    recordingPurchase: purchaseState === "recording",
  };
}
