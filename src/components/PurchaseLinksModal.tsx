import { useNavigate } from "react-router-dom";
import Modal from "./Modal";
import PurchaseLinks from "./PurchaseLinks";
import { useAuth } from "../context/useAuth";
import { hasPermission, Permission } from "@shared/permissions";
import { CloudUploadIcon } from "@/components/icons";

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin =
    user !== null && hasPermission(user.permissions, Permission.ADMIN);

  const handleAddToLibrary = () => {
    onAddToLibrary?.();
    onClose();
  };

  const handleUploadClick = () => {
    onClose();
    navigate(`/library/upload?mbid=${albumMbid}`);
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
        </div>

        <PurchaseLinks artistName={artistName} albumTitle={albumTitle} />

        {isAdmin && (
          <div className="border-t-2 border-black pt-4">
            <button
              onClick={handleUploadClick}
              className="w-full flex items-center justify-center gap-2 bg-amber-50 dark:bg-gray-700/50 hover:bg-amber-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-xl border-2 border-dashed border-amber-400 hover:border-amber-500 transition-all text-sm"
            >
              <CloudUploadIcon className="w-5 h-5 text-amber-400" />
              Upload purchased files
            </button>
          </div>
        )}

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
