import { useMemo } from "react";
import StatusBadge from "@/components/StatusBadge";
import { RecentImport } from "@/types";

interface RecentImportsProps {
  items: RecentImport[];
}

export default function RecentImports({ items }: RecentImportsProps) {
  const groupedItems = useMemo(() => {
    const albumMap = new Map<number, RecentImport>();
    items.forEach((item) => {
      if (!albumMap.has(item.albumId)) {
        albumMap.set(item.albumId, item);
      }
    });

    return Array.from(albumMap.values());
  }, [items]);

  if (groupedItems.length === 0) {
    return <p className="text-gray-400 text-sm">No recent imports.</p>;
  }

  return (
    <div className="space-y-2">
      {groupedItems.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-4 py-3 border-2 border-black shadow-cartoon-md hover:translate-y-[-2px] hover:shadow-cartoon-lg transition-all"
        >
          <div>
            <p className="text-gray-900 dark:text-gray-100 font-medium">
              {item.album.title}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {item.artist.artistName}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {new Date(item.date).toLocaleString()}
            </p>
          </div>
          <StatusBadge status="imported" />
        </div>
      ))}
    </div>
  );
}
