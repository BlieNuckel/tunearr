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
  onAddToLibrary?: () => void;
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
    onAddToLibrary?.();
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Purchase Options
          </h2>
          <p className="text-gray-500 text-sm">
            {albumTitle} by {artistName}
          </p>
        </div>

        <PurchaseLinks artistName={artistName} albumTitle={albumTitle} />

        <div className="border-t-2 border-black pt-4">
          <p className="text-gray-600 text-sm font-medium mb-2">
            Upload purchased files:
          </p>

          {step === "idle" && (
            <FileUploadZone onFiles={(files) => upload(files, albumMbid)} />
          )}

          {step === "uploading" && (
            <div className="flex items-center justify-center gap-2 py-6">
              <svg
                className="animate-spin h-5 w-5 text-amber-400"
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
              <p className="text-gray-600 text-sm">
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
                className="animate-spin h-5 w-5 text-emerald-500"
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
              <p className="text-gray-600 text-sm">Importing to Lidarr...</p>
            </div>
          )}

          {step === "done" && (
            <div className="bg-emerald-400 text-black border-2 border-black rounded-xl p-3 text-sm font-medium shadow-cartoon-sm">
              Files imported successfully!
            </div>
          )}

          {step === "error" && (
            <div className="space-y-2">
              <div className="bg-rose-400 text-white border-2 border-black rounded-xl p-3 text-sm font-medium shadow-cartoon-sm">
                {error}
              </div>
              <button
                onClick={reset}
                className="text-gray-500 hover:text-gray-700 text-sm underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        <div className="pt-4 border-t-2 border-black space-y-2">
          {onAddToLibrary ? (
            <>
              <button
                onClick={handleAddToLibrary}
                className="w-full bg-pink-400 hover:bg-pink-300 text-black font-bold py-3 px-4 rounded-xl border-2 border-black shadow-cartoon-md hover:translate-y-[-2px] hover:shadow-cartoon-lg active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
              >
                Add to Library
              </button>
              <button
                onClick={handleClose}
                className="w-full bg-gray-100 hover:bg-gray-50 text-gray-600 font-medium py-2 px-4 rounded-xl border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              className="w-full bg-gray-100 hover:bg-gray-50 text-gray-600 font-medium py-2 px-4 rounded-xl border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
