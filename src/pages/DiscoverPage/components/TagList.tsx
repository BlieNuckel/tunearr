interface Tag {
  name: string;
}

interface TagListProps {
  tags: Tag[];
  activeTags: string[];
  showingTagResults: boolean;
  selectedArtist: string;
  onTagClick: (tag: string) => void;
}

export default function TagList({
  tags,
  activeTags,
  showingTagResults,
  selectedArtist,
  onTagClick,
}: TagListProps) {
  const tagsDisplay =
    activeTags.length === 1
      ? `"${activeTags[0]}"`
      : activeTags.map((t) => `"${t}"`).join(", ");

  return (
    <div className="mb-4">
      <div className="flex items-center flex-wrap gap-2 mb-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {showingTagResults
            ? `Top artists for ${tagsDisplay}`
            : `Similar to "${selectedArtist}"`}
        </h2>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, index) => (
            <button
              key={tag.name}
              onClick={() => onTagClick(tag.name)}
              style={{ "--stagger-index": index } as React.CSSProperties}
              className={`stagger-fade-in px-2.5 py-1 rounded-full text-xs border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all ${
                activeTags.includes(tag.name)
                  ? "bg-amber-300 text-black font-bold dark:text-black"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-gray-700"
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
