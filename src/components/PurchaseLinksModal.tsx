import Modal from "./Modal";
import PurchaseLinks from "./PurchaseLinks";
import FileUploadZone from "./FileUploadZone";
import ImportReview from "./ImportReview";
import useManualImport from "../hooks/useManualImport";

interface PurchaseLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistName: string;
  albumTitle: string;
  albumMbid: string;
  onAddToLibrary: () => void;
}

export default function PurchaseLinksModal({
  isOpen,
  onClose,
  artistName,
  albumTitle,
  albumMbid,
  onAddToLibrary,
}: PurchaseLinksModalProps) {
  const { step, items, error, upload, confirm, cancel, reset } =
    useManualImport();

  const handleAddToLibrary = () => {
    onAddToLibrary();
    onClose();
  };

  const handleClose = () => {
    if (step === "reviewing") {
      cancel();
    } else {
      reset();
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">
            Purchase Options
          </h2>
          <p className="text-gray-400 text-sm">
            {albumTitle} by {artistName}
          </p>
        </div>

        <PurchaseLinks artistName={artistName} albumTitle={albumTitle} />

        <div className="border-t border-gray-700 pt-4">
          <p className="text-gray-300 text-sm font-medium mb-2">
            Upload purchased files:
          </p>

          {step === "idle" && (
            <FileUploadZone onFiles={(files) => upload(files, albumMbid)} />
          )}

          {step === "uploading" && (
            <div className="flex items-center justify-center gap-2 py-6">
              <svg
                className="animate-spin h-5 w-5 text-blue-400"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-gray-300 text-sm">
                Uploading and scanning files...
              </p>
            </div>
          )}

          {step === "reviewing" && (
            <ImportReview
              items={items}
              onConfirm={() => confirm(items)}
              onCancel={cancel}
            />
          )}

          {step === "importing" && (
            <div className="flex items-center justify-center gap-2 py-6">
              <svg
                className="animate-spin h-5 w-5 text-green-400"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-gray-300 text-sm">Importing to Lidarr...</p>
            </div>
          )}

          {step === "done" && (
            <div className="bg-green-900/30 text-green-400 border border-green-800 rounded-lg p-3 text-sm">
              Files imported successfully!
            </div>
          )}

          {step === "error" && (
            <div className="space-y-2">
              <div className="bg-red-900/30 text-red-400 border border-red-800 rounded-lg p-3 text-sm">
                {error}
              </div>
              <button
                onClick={reset}
                className="text-gray-400 hover:text-gray-300 text-sm underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-700 space-y-2">
          <button
            onClick={handleAddToLibrary}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Add to Library
          </button>
          <button
            onClick={handleClose}
            className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
