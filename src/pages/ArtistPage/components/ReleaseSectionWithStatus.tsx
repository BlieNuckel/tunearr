import SectionStatus, { type SectionState } from "@/components/SectionStatus";
import ReleaseSectionGrid from "./ReleaseSectionGrid";
import type { ReleaseGroup } from "@/types";
import type { AlbumLibraryInfo } from "@shared/albumLibrary";

interface ReleaseSectionWithStatusProps {
  title: string;
  /** Used in the failure copy: "more from this artist". */
  subject: string;
  items: ReleaseGroup[];
  state: SectionState;
  getAlbumLibrary?: (albumMbid: string) => AlbumLibraryInfo | null;
}

/**
 * A release grid that fails on its own: a busy or failed load shows its status
 * and retry in place of the grid, and an empty result hides the section.
 */
export default function ReleaseSectionWithStatus({
  title,
  subject,
  items,
  state,
  getAlbumLibrary,
}: ReleaseSectionWithStatusProps) {
  if (state.retrying || state.error) {
    return (
      <section className="mb-8">
        <h2 className="mb-3 text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wide">
          {title}
        </h2>
        <SectionStatus
          subject={subject}
          error={state.error}
          errorKind={state.errorKind}
          retrying={state.retrying}
          onRetry={() => void state.refresh()}
        />
      </section>
    );
  }

  if (!state.loading && items.length === 0) return null;

  return (
    <ReleaseSectionGrid
      title={title}
      items={items}
      loading={state.loading}
      getAlbumLibrary={getAlbumLibrary}
    />
  );
}
