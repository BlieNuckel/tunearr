import usePromotedAlbum from "@/hooks/usePromotedAlbum";
import useReportSectionStatus from "../../useReportSectionStatus";
import PromotedAlbum from "../PromotedAlbum";
import type { SectionComponentProps } from "../../types";

export default function SpotlightSection({
  onStatusChange,
}: SectionComponentProps) {
  const { promotedAlbum, loading, error, refresh } = usePromotedAlbum();

  useReportSectionStatus(onStatusChange, {
    loading,
    error: Boolean(error),
    empty: !promotedAlbum,
  });

  if (!promotedAlbum && !loading) return null;

  return (
    <PromotedAlbum data={promotedAlbum} loading={loading} onRefresh={refresh} />
  );
}
