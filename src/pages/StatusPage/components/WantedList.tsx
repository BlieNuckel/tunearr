import { useState } from "react";
import { WantedItem } from "@/types";
import PurchaseLinksModal from "@/components/PurchaseLinksModal";
import { SearchIcon, EyeSlashIcon } from "@/components/icons";

interface WantedListProps {
  items: WantedItem[];
  onSearch: (albumId: number) => void;
  onRemove: (albumMbid: string) => void;
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
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-4 py-3 border-2 border-black shadow-cartoon-md hover:-translate-y-0.5 hover:shadow-cartoon-lg transition-all cursor-pointer"
          >
            <div>
              <p className="text-gray-900 dark:text-gray-100 font-medium">{item.title}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {item.artist?.artistName || "Unknown Artist"}
              </p>
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
        ))}
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
