import { useState } from "react";
import { WantedItem, WantedItemEvent } from "@/types";
import PurchaseLinksModal from "@/components/PurchaseLinksModal";
import { SearchIcon, EyeSlashIcon } from "@/components/icons";

interface WantedListProps {
  items: WantedItem[];
  onSearch: (albumId: number) => void;
  onRemove: (albumMbid: string) => void;
}

function formatEventLabel(lastEvent: WantedItemEvent | null): {
  text: string;
  colorClass: string;
} {
  if (!lastEvent) {
    return { text: "No grab attempts", colorClass: "text-gray-400" };
  }

  const date = new Date(lastEvent.date).toLocaleDateString();

  switch (lastEvent.eventType) {
    case 1:
      return { text: `Grabbed ${date}`, colorClass: "text-amber-500" };
    case 4:
      return { text: `Download failed ${date}`, colorClass: "text-rose-500" };
    case 7:
      return {
        text: `Import incomplete ${date}`,
        colorClass: "text-orange-500",
      };
    default:
      return { text: `Event ${date}`, colorClass: "text-gray-400" };
  }
}

export default function WantedList({
  items,
  onSearch,
  onRemove,
}: WantedListProps) {
  const [selectedItem, setSelectedItem] = useState<WantedItem | null>(null);

  if (items.length === 0) {
    return <p className="text-gray-400 text-sm">No missing albums.</p>;
  }

  return (
    <>
      <div className="space-y-2">
        {items.map((item, index) => {
          const { text, colorClass } = formatEventLabel(item.lastEvent);
          return (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="stagger-fade-in flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-4 py-3 border-2 border-black shadow-cartoon-md hover:-translate-y-0.5 hover:shadow-cartoon-lg transition-all cursor-pointer"
              style={{ "--stagger-index": index } as React.CSSProperties}
            >
              <div>
                <p className="text-gray-900 dark:text-gray-100 font-medium">
                  {item.title}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {item.artist?.artistName || "Unknown Artist"}
                </p>
                <p className={`text-xs mt-1 ${colorClass}`}>{text}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.foreignAlbumId);
                  }}
                  aria-label="Unmonitor"
                  className="w-9 h-9 flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-black rounded-lg border-2 border-black shadow-cartoon-sm hover:-translate-y-px hover:shadow-cartoon-md active:translate-y-px active:shadow-cartoon-pressed transition-all"
                >
                  <EyeSlashIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSearch(item.id);
                  }}
                  aria-label="Search"
                  className="w-9 h-9 flex items-center justify-center bg-pink-400 hover:bg-pink-300 text-black rounded-lg border-2 border-black shadow-cartoon-sm hover:-translate-y-px hover:shadow-cartoon-md active:translate-y-px active:shadow-cartoon-pressed transition-all"
                >
                  <SearchIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedItem && (
        <PurchaseLinksModal
          isOpen={true}
          onClose={() => setSelectedItem(null)}
          artistName={selectedItem.artist?.artistName || "Unknown Artist"}
          albumTitle={selectedItem.title}
          albumMbid={selectedItem.foreignAlbumId}
        />
      )}
    </>
  );
}
