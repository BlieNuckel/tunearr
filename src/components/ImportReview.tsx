import { ManualImportItem } from "../hooks/useManualImport";

interface ImportReviewProps {
  items: ManualImportItem[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ImportReview({
  items,
  onConfirm,
  onCancel,
}: ImportReviewProps) {
  return (
    <div className="space-y-3">
      <div className="max-h-60 overflow-y-auto space-y-1">
        {items.map((item: ManualImportItem, i: number) => (
          <div
            key={i}
            className="flex items-center gap-2 p-2 bg-gray-700 rounded text-sm"
          >
            <div className="flex-1 min-w-0">
              <p className="text-white truncate">{item.name}</p>
              <div className="flex gap-2 text-xs">
                {item.tracks?.[0] && (
                  <span className="text-gray-400">
                    {item.tracks[0].trackNumber}. {item.tracks[0].title}
                  </span>
                )}
                <span className="text-gray-500">
                  {item.quality?.quality?.name}
                </span>
              </div>
            </div>
            {item.rejections?.length > 0 && (
              <span
                className="text-yellow-400 text-xs flex-shrink-0"
                title={item.rejections.map((r) => r.reason).join(", ")}
              >
                {item.rejections.length} warning
                {item.rejections.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
        >
          Confirm Import ({items.length} file{items.length !== 1 ? "s" : ""})
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
