interface TagCloudProps {
  tags: { name: string; count: number }[];
}

export default function TagCloud({ tags }: TagCloudProps) {
  const sorted = [...tags].sort((a, b) => b.count - a.count).slice(0, 15);

  if (sorted.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 justify-center">
      {sorted.map((tag, i) => (
        <span
          key={tag.name}
          className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-pink-100 to-amber-100 dark:from-pink-900/30 dark:to-amber-900/30 text-pink-800 dark:text-pink-300 rounded-full border border-pink-300 dark:border-pink-700 stagger-fade-in"
          style={{ "--stagger-index": i } as React.CSSProperties}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
}
