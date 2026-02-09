/**
 * @param {{ items: Array<object>, onSearch: (albumId: number) => void }} props
 */
export default function WantedList({ items, onSearch }) {
  if (items.length === 0) {
    return <p className="text-gray-500 text-sm">No missing albums.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3 border border-gray-700"
        >
          <div>
            <p className="text-white font-medium">{item.title}</p>
            <p className="text-gray-400 text-sm">
              {item.artist?.artistName || "Unknown Artist"}
            </p>
          </div>
          <button
            onClick={() => onSearch(item.id)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md transition-colors"
          >
            Search
          </button>
        </div>
      ))}
    </div>
  );
}
