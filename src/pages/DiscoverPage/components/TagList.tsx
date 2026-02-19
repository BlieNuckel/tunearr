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
        <h2 className="text-lg font-semibold text-gray-900">
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
              className={`px-2.5 py-1 rounded-full text-xs border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all ${
                activeTag === tag.name
                  ? "bg-amber-300 text-black font-bold"
                  : "bg-white text-gray-700 hover:bg-amber-50"
              }`}
            >
              {tag.name}
            </button>
          ))}
          {activeTag && (
            <button
              onClick={onClearTag}
              className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-500 hover:text-gray-700 border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
            >
              Back to similar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
