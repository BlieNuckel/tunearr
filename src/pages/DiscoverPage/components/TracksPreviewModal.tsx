import Modal from "@/components/Modal";
import TrackList from "@/components/TrackList";
import type { Medium } from "@/types";

interface TracksPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  albumName: string;
  artistName: string;
  media: Medium[];
  loading: boolean;
  error: string | null;
  onTogglePreview: (url: string) => void;
  isTrackPlaying: (url: string) => boolean;
}

export default function TracksPreviewModal({
  isOpen,
  onClose,
  albumName,
  artistName,
  media,
  loading,
  error,
  onTogglePreview,
  isTrackPlaying,
}: TracksPreviewModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} panelClassName="w-full max-w-lg">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {albumName}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
          {artistName}
        </p>
        <div className="overlay-scrollbar max-h-96 overflow-y-auto">
          <TrackList
            media={media}
            loading={loading}
            error={error}
            onTogglePreview={onTogglePreview}
            isTrackPlaying={isTrackPlaying}
          />
        </div>
      </div>
    </Modal>
  );
}
