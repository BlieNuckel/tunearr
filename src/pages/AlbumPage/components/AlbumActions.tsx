import MonitorButton from "@/components/MonitorButton";
import OptionSelect from "@/components/OptionSelect";
import AlbumActionModals from "@/components/AlbumActionModals";
import Spinner from "@/components/Spinner";
import { HeartIcon } from "@/components/icons";
import useAlbumActions from "@/hooks/useAlbumActions";
import type { ReleaseGroup } from "@/types";

interface AlbumActionsProps {
  releaseGroup: ReleaseGroup;
  inLibrary?: boolean;
  initialWanted?: boolean;
}

export default function AlbumActions({
  releaseGroup,
  inLibrary,
  initialWanted,
}: AlbumActionsProps) {
  const actions = useAlbumActions({ releaseGroup, inLibrary, initialWanted });

  return (
    <div className="flex items-center gap-2">
      <MonitorButton
        state={actions.effectiveState}
        onClick={actions.handleMonitorClick}
        errorMsg={actions.errorMsg ?? undefined}
      />
      <button
        type="button"
        onClick={actions.toggleWanted}
        disabled={actions.wantedPending}
        aria-label={actions.isWanted ? "Remove from wanted" : "Add to wanted"}
        aria-pressed={actions.isWanted}
        className={`w-9 h-9 flex items-center justify-center rounded-lg border-2 border-black shadow-cartoon-sm transition-colors ${
          actions.isWanted
            ? "bg-amber-300 text-black hover:bg-amber-200"
            : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        } ${actions.wantedPending ? "cursor-wait" : ""}`}
      >
        {actions.wantedPending ? (
          <Spinner />
        ) : (
          <HeartIcon className="w-5 h-5" />
        )}
      </button>
      <OptionSelect options={actions.menuOptions} title={actions.albumTitle} />
      <AlbumActionModals actions={actions} />
    </div>
  );
}
