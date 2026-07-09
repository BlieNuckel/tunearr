import usePromotedArtists from "@/hooks/usePromotedArtists";
import useReportSectionStatus from "../../useReportSectionStatus";
import PromotedArtists from "../PromotedArtists";
import type { SectionComponentProps } from "../../types";

export default function ArtistsSection({
  onStatusChange,
}: SectionComponentProps) {
  const { promotedArtists, loading, error, refresh } = usePromotedArtists();

  useReportSectionStatus(onStatusChange, {
    loading,
    error: Boolean(error),
    empty: (promotedArtists?.artists ?? []).length === 0,
  });

  if (!promotedArtists && !loading) return null;

  return (
    <PromotedArtists
      data={promotedArtists}
      loading={loading}
      onRefresh={refresh}
    />
  );
}
