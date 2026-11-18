import SectionStatus, { type SectionState } from "@/components/SectionStatus";
import AlbumHeader from "./AlbumHeader";
import AlbumHeaderSkeleton from "./AlbumHeaderSkeleton";
import type { AlbumDetails, AlbumLabel } from "@/types";
import type { AlbumLibraryInfo } from "@shared/albumLibrary";

interface AlbumHeaderSectionProps {
  album: AlbumDetails | null;
  /** The header is drawn from the card the user came from, not from fetched details. */
  fromPreview: boolean;
  details: SectionState;
  label: AlbumLabel | null;
  labelState: SectionState;
  inLibrary: boolean;
  initialWanted: boolean;
  library: AlbumLibraryInfo | null;
}

/**
 * The only part of the album page that waits on album details. When they fail,
 * this box says so and the rest of the page carries on.
 */
export default function AlbumHeaderSection({
  album,
  fromPreview,
  details,
  label,
  labelState,
  inLibrary,
  initialWanted,
  library,
}: AlbumHeaderSectionProps) {
  if (!album) {
    if (details.loading && !details.retrying) return <AlbumHeaderSkeleton />;
    return (
      <div className="mb-8 p-4 bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-md">
        <SectionStatus
          subject="this album"
          error={details.error ?? "Album not found"}
          errorKind={details.errorKind}
          retrying={details.retrying}
          onRetry={() => void details.refresh()}
        />
      </div>
    );
  }

  return (
    <>
      <AlbumHeader
        album={album}
        label={label}
        inLibrary={inLibrary}
        initialWanted={initialWanted}
        library={library}
      />
      {fromPreview && (
        <SectionStatus
          className="-mt-6 mb-6"
          subject="the rest of this album's details"
          error={details.error}
          errorKind={details.errorKind}
          retrying={details.retrying}
          onRetry={() => void details.refresh()}
        />
      )}
      <SectionStatus
        className="-mt-6 mb-6"
        subject="the label"
        error={labelState.error}
        errorKind={labelState.errorKind}
        retrying={labelState.retrying}
        onRetry={() => void labelState.refresh()}
      />
    </>
  );
}
