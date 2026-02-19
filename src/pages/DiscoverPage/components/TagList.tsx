interface Tag {
  name: string;
}

interface TagListProps {
  tags: Tag[];
  activeTag: string | null;
  showingTagResults: boolean;
  selectedArtist: string;
  onTagClick: (tag: string) => void;
  onClearTag: () => void;
}

export default function TagList({
  tags,
  activeTag,
  showingTagResults,
  selectedArtist,
  onTagClick,
  onClearTag,
}: TagListProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center flex-wrap gap-2 mb-2">
        <h2 className="text-lg font-semibold text-white">
          {showingTagResults
            ? `Top artists for "${activeTag}"`
            : `Similar to "${selectedArtist}"`}
        </h2>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag.name}
              onClick={() => onTagClick(tag.name)}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                activeTag === tag.name
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {tag.name}
            </button>
          ))}
          {activeTag && (
            <button
              onClick={onClearTag}
              className="px-2.5 py-1 rounded-full text-xs bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
            >
              Back to similar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
