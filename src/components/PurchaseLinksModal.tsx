import { useEffect } from "react";
import Modal from "./Modal";
import PurchaseLinks from "./PurchaseLinks";
import PurchaseDecisionBanner from "./PurchaseDecisionBanner";
import { ExternalLinkIcon } from "@/components/icons";
import usePurchaseContext from "@/hooks/usePurchaseContext";
import type { LabelInfo } from "@/hooks/usePurchaseContext";

interface PurchaseLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistName: string;
  albumTitle: string;
  albumMbid: string;
  onAddToLibrary?: () => void;
}

function LabelInfoLinks({ label }: { label: LabelInfo }) {
  const query = encodeURIComponent(label.name);

  return (
    <span className="inline-flex gap-2 ml-1">
      <a
        href={`https://musicbrainz.org/label/${label.mbid}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
      >
        MusicBrainz
        <ExternalLinkIcon className="w-3 h-3" />
      </a>
      <a
        href={`https://en.wikipedia.org/w/index.php?search=${query}+record+label`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
      >
        Wikipedia
        <ExternalLinkIcon className="w-3 h-3" />
      </a>
    </span>
  );
}

export default function PurchaseLinksModal({
  isOpen,
  onClose,
  artistName,
  albumTitle,
  albumMbid,
  onAddToLibrary,
}: PurchaseLinksModalProps) {
  const { context, loading, progress, fetchContext, reset } =
    usePurchaseContext();

  useEffect(() => {
    if (isOpen && albumMbid) {
      fetchContext(albumMbid);
    } else {
      reset();
    }
  }, [isOpen, albumMbid, fetchContext, reset]);

  const handleAddToLibrary = () => {
    onAddToLibrary?.();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Purchase Options
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {albumTitle} by {artistName}
          </p>
          {context?.label && (
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
              {context.label.name}
              <LabelInfoLinks label={context.label} />
            </p>
          )}
        </div>

        <PurchaseDecisionBanner
          context={context}
          loading={loading}
          progress={progress}
        />

        <PurchaseLinks artistName={artistName} albumTitle={albumTitle} />

        <div className="pt-4 border-t-2 border-black space-y-2">
          {onAddToLibrary ? (
            <>
              <button
                onClick={handleAddToLibrary}
                className="w-full bg-pink-400 hover:bg-pink-300 text-black font-bold py-3 px-4 rounded-xl border-2 border-black shadow-cartoon-md hover:translate-y-[-2px] hover:shadow-cartoon-lg active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
              >
                Request Album
              </button>
              <button
                onClick={onClose}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-medium py-2 px-4 rounded-xl border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-medium py-2 px-4 rounded-xl border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
