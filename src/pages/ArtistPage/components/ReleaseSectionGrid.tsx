import ReleaseGroupCard from "@/components/ReleaseGroupCard";
import type { ReleaseGroup } from "@/types";

const DEAL_ROTATIONS = [-4, 3.5, -3, 4.5, -3.5, 3];

interface ReleaseSectionGridProps {
  title: string;
  items: ReleaseGroup[];
}

export default function ReleaseSectionGrid({
  title,
  items,
}: ReleaseSectionGridProps) {
  return (
    <section className="mb-8">
      <h2 className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wide mb-3">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
        {items.map((rg, index) => (
          <div
            key={rg.id}
            className="cascade-deal-in"
            style={
              {
                "--deal-index": index,
                "--deal-rotate": `${DEAL_ROTATIONS[index % DEAL_ROTATIONS.length]}deg`,
              } as React.CSSProperties
            }
          >
            <ReleaseGroupCard releaseGroup={rg} />
          </div>
        ))}
      </div>
    </section>
  );
}
