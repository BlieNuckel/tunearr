import { useState } from 'react';
import type { PromotedAlbumData } from '@/hooks/usePromotedAlbum';
import MonitorButton from '@/components/MonitorButton';
import PurchaseLinksModal from '@/components/PurchaseLinksModal';
import { RefreshIcon } from '@/components/icons';
import useLidarr from '@/hooks/useLidarr';

/** @returns deterministic pastel HSL color derived from the input string */
function pastelColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 85%)`;
}

interface PromotedAlbumProps {
  data: PromotedAlbumData;
  onRefresh: () => void;
}

export default function PromotedAlbum({ data, onRefresh }: PromotedAlbumProps) {
  const [coverError, setCoverError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { state, errorMsg, addToLidarr } = useLidarr();

  const { album, tag, inLibrary } = data;
  const pastelBg = pastelColorFromId(album.mbid);

  const effectiveState = inLibrary ? "already_monitored" : state;

  const handleMonitorClick = () => {
    if (effectiveState === 'idle' || effectiveState === 'error') {
      setIsModalOpen(true);
    }
  };

  const handlePreviewClick = () => {
    setIsModalOpen(true);
  };

  const handleAddToLibrary = () => {
    addToLidarr({ albumMbid: album.mbid });
  };

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-500">
            Recommended for you
          </h2>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 hover:text-gray-900 text-xs font-bold bg-white hover:bg-gray-50 rounded-lg border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
            aria-label="Shuffle recommendation"
          >
            <RefreshIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Shuffle</span>
          </button>
        </div>

        <div className="bg-white rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden flex flex-col sm:flex-row">
          <div
            className="w-full sm:w-48 aspect-square sm:aspect-auto sm:h-48 flex-shrink-0"
            style={{ backgroundColor: pastelBg }}
          >
            {!coverError && (
              <img
                src={album.coverUrl}
                alt={`${album.name} cover`}
                className="w-full h-full object-cover text-transparent"
                onError={() => setCoverError(true)}
              />
            )}
          </div>

          <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
            <div>
              <h3 className="text-lg font-bold text-gray-900 truncate">
                {album.name}
              </h3>
              <p className="text-gray-500 text-sm truncate">
                {album.artistName}
              </p>
              <span className="inline-block mt-2 px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded-full border border-violet-200">
                Because you listen to {tag}
              </span>
            </div>

            <div className="mt-3 flex gap-2 justify-end">
              <button
                onClick={handlePreviewClick}
                className="px-4 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 font-bold text-sm rounded-lg border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
              >
                Preview
              </button>
              <MonitorButton
                state={effectiveState}
                onClick={handleMonitorClick}
                errorMsg={errorMsg ?? undefined}
              />
            </div>
          </div>
        </div>
      </div>

      <PurchaseLinksModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        artistName={album.artistName}
        albumTitle={album.name}
        albumMbid={album.mbid}
        onAddToLibrary={handleAddToLibrary}
      />
    </>
  );
}
