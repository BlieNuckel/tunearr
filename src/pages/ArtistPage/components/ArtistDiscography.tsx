import Skeleton from "@/components/Skeleton";
import SectionStatus, { type SectionState } from "@/components/SectionStatus";
import ReleaseGridSkeleton from "./ReleaseGridSkeleton";
import ReleaseSectionGrid from "./ReleaseSectionGrid";
import type { ReleaseSection } from "@/utils/groupArtistReleases";
import type { AlbumLibraryInfo } from "@shared/albumLibrary";

interface ArtistDiscographyProps {
  sections: ReleaseSection[];
  state: SectionState;
  getAlbumLibrary?: (albumMbid: string) => AlbumLibraryInfo | null;
}

export default function ArtistDiscography({
  sections,
  state,
  getAlbumLibrary,
}: ArtistDiscographyProps) {
  if (state.retrying || state.error) {
    return (
      <SectionStatus
        className="mb-8"
        subject="this artist's releases"
        error={state.error}
        errorKind={state.errorKind}
        retrying={state.retrying}
        onRetry={() => void state.refresh()}
      />
    );
  }

  if (state.loading) {
    return (
      <section className="mb-8">
        <Skeleton className="h-4 w-24 mb-3" />
        <ReleaseGridSkeleton />
      </section>
    );
  }

  if (sections.length === 0) {
    return (
      <p className="text-gray-400 dark:text-gray-500 text-sm mb-8">
        No releases found for this artist.
      </p>
    );
  }

  return (
    <>
      {sections.map((section, index) => (
        <ReleaseSectionGrid
          key={section.title}
          title={section.title}
          items={section.items}
          defaultExpanded={index === 0}
          getAlbumLibrary={getAlbumLibrary}
        />
      ))}
    </>
  );
}
