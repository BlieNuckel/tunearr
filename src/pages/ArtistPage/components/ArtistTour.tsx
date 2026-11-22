import { useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import Modal from "@/components/Modal";
import { TicketIcon } from "@/components/icons";
import type { ArtistLiveDatesState } from "@/hooks/useArtistLiveDates";
import { TOUR_PARAM } from "@/utils/artistTour";
import ArtistLiveDates from "./ArtistLiveDates";

interface ArtistTourProps {
  artistName: string;
  live: ArtistLiveDatesState;
}

function tourLabel(count: number): string {
  return count === 1 ? "1 tour date" : `${count} tour dates`;
}

function TourDatesBody({ live }: { live: ArtistLiveDatesState }) {
  if (live.error && live.dates.length === 0) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        Could not load live dates
      </p>
    );
  }
  return <ArtistLiveDates dates={live.dates} tracking={live.tracking} />;
}

/**
 * The tour dates button beside Follow, and the modal it opens. `?tour=1` opens
 * the modal directly, once the dates have loaded, so links that promise the
 * full tour land on it.
 */
export default function ArtistTour({ artistName, live }: ArtistTourProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [deepLinkUsed, setDeepLinkUsed] = useState(false);
  const deepLinked = searchParams.get(TOUR_PARAM) === "1";

  // Opened once per deep link: the router drops the param in a transition, after
  // the close has rendered, and a later refetch reports loading again.
  if (!deepLinked && deepLinkUsed) setDeepLinkUsed(false);
  if (deepLinked && !deepLinkUsed && !live.loading) {
    setDeepLinkUsed(true);
    setOpen(true);
  }

  const handleClose = () => {
    setOpen(false);
    if (!deepLinked) return;
    const next = new URLSearchParams(searchParams);
    next.delete(TOUR_PARAM);
    setSearchParams(next, { replace: true, state: location.state });
  };

  return (
    <>
      {live.dates.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-full border-2 border-black font-bold text-sm bg-orange-400 text-black"
        >
          <TicketIcon className="h-4 w-4" aria-hidden />
          {tourLabel(live.dates.length)}
        </button>
      )}

      <Modal
        isOpen={open}
        onClose={handleClose}
        panelClassName="max-w-lg w-full max-h-[85vh]"
      >
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {artistName}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tour dates</p>
        </div>
        <div className="min-h-0 overflow-y-auto">
          <TourDatesBody live={live} />
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="mt-4 w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-medium py-2 px-4 rounded-xl border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
        >
          Close
        </button>
      </Modal>
    </>
  );
}
