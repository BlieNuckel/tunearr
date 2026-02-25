import type { ReleaseGroup } from "@/types";
import AlbumCard from "./AlbumCard";

interface SuggestionCardProps {
  releaseGroup: ReleaseGroup;
  tags: string[];
  onClick: () => void;
}

export default function SuggestionCard({
  releaseGroup,
  tags,
  onClick,
}: SuggestionCardProps) {
  return (
    <div>
      <div className="flex flex-wrap gap-0.5 mb-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-block px-1.5 py-0.5 text-xs font-medium bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full border border-pink-300 dark:border-pink-700"
          >
            {tag}
          </span>
        ))}
      </div>
      <AlbumCard releaseGroup={releaseGroup} onClick={onClick} />
    </div>
  );
}
