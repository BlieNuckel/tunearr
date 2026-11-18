import SectionStatus, { type SectionState } from "@/components/SectionStatus";
import ArtistHeader from "./ArtistHeader";
import ArtistHeaderSkeleton from "./ArtistHeaderSkeleton";
import type { ArtistDetails } from "@/types";

interface ArtistHeaderSectionProps {
  artist: ArtistDetails | null;
  details: SectionState;
  inLibrary: boolean;
}

/** Only the header waits on artist details; when they fail the rest of the page stays. */
export default function ArtistHeaderSection({
  artist,
  details,
  inLibrary,
}: ArtistHeaderSectionProps) {
  if (artist) return <ArtistHeader artist={artist} inLibrary={inLibrary} />;
  if (details.loading && !details.retrying) return <ArtistHeaderSkeleton />;

  return (
    <div className="mb-8 p-4 bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-md">
      <SectionStatus
        subject="this artist"
        error={details.error ?? "Artist not found"}
        errorKind={details.errorKind}
        retrying={details.retrying}
        onRetry={() => void details.refresh()}
      />
    </div>
  );
}
