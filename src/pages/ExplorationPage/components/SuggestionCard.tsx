import type { ReleaseGroup } from "@/types";
import AlbumCard from "./AlbumCard";

interface SuggestionCardProps {
  releaseGroup: ReleaseGroup;
  onClick: () => void;
}

export default function SuggestionCard({
  releaseGroup,
  onClick,
}: SuggestionCardProps) {
  return (
    <div>
      <AlbumCard releaseGroup={releaseGroup} onClick={onClick} />
    </div>
  );
}
