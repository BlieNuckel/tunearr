import type { ReleaseGroup } from "@/types";
import AlbumCard from "./AlbumCard";

interface SuggestionCardProps {
  releaseGroup: ReleaseGroup;
  tag: string;
  onClick: () => void;
}

export default function SuggestionCard({
  releaseGroup,
  tag,
  onClick,
}: SuggestionCardProps) {
  return (
    <div>
      <span className="inline-block px-1.5 py-0.5 text-xs font-medium bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full border border-pink-300 dark:border-pink-700 mb-1.5">
        {tag}
      </span>
      <AlbumCard releaseGroup={releaseGroup} onClick={onClick} />
    </div>
  );
}
