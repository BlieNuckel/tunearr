import PurchaseLinksModal from "./PurchaseLinksModal";
import PurchasePriceModal from "./PurchasePriceModal";
import type { AlbumActions } from "../hooks/useAlbumActions";

interface AlbumActionModalsProps {
  actions: AlbumActions;
}

export default function AlbumActionModals({ actions }: AlbumActionModalsProps) {
  return (
    <>
      <PurchaseLinksModal
        isOpen={actions.isLinksModalOpen}
        onClose={actions.closeLinksModal}
        artistName={actions.artistName}
        albumTitle={actions.albumTitle}
        albumMbid={actions.albumMbid}
        onAddToLibrary={actions.handleAddToLibrary}
      />
      <PurchasePriceModal
        isOpen={actions.isPriceModalOpen}
        onClose={actions.closePriceModal}
        artistName={actions.artistName}
        albumTitle={actions.albumTitle}
        onConfirm={actions.handleRecordPurchase}
        saving={actions.recordingPurchase}
      />
    </>
  );
}
