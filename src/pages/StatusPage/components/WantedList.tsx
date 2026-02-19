import { WantedItem } from "@/types";

interface WantedListProps {
  items: WantedItem[];
  onSearch: (albumId: number) => void;
}

export default function WantedList({ items, onSearch }: WantedListProps) {
  if (items.length === 0) {
    return <p className="text-gray-400 text-sm">No missing albums.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border-2 border-black shadow-cartoon-md hover:translate-y-[-2px] hover:shadow-cartoon-lg transition-all"
        >
          <div>
            <p className="text-gray-900 font-medium">{item.title}</p>
            <p className="text-gray-500 text-sm">
              {item.artist?.artistName || "Unknown Artist"}
            </p>
          </div>
          <button
            onClick={() => onSearch(item.id)}
            className="px-3 py-1.5 bg-pink-400 hover:bg-pink-300 text-black text-sm font-bold rounded-lg border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
          >
            Search
          </button>
        </div>
      ))}
    </div>
  );
}
