import { useLocation, useSearchParams } from "react-router-dom";
import Modal from "@/components/Modal";
import ModalHeader from "@/components/ModalHeader";
import { SECONDARY_BUTTON } from "@/components/buttonStyles";
import { TicketIcon } from "@/components/icons";
import { LiveLoadError } from "@/components/live/LiveEventBits";
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

function withTourParam(
  params: URLSearchParams,
  open: boolean
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (open) next.set(TOUR_PARAM, "1");
  else next.delete(TOUR_PARAM);
  return next;
}

function TourDatesBody({ live }: { live: ArtistLiveDatesState }) {
  if (live.error && live.dates.length === 0) return <LiveLoadError />;
  return <ArtistLiveDates dates={live.dates} tracking={live.tracking} />;
}

/**
 * The tour dates button beside Follow, and the modal it opens. `?tour=1` is the
 * open state, so links that promise the full tour land on it.
 */
export default function ArtistTour({ artistName, live }: ArtistTourProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  // Waits for the first load; a refetch keeps the dates it has, so it can't close the modal.
  const open =
    searchParams.get(TOUR_PARAM) === "1" &&
    (!live.loading || live.dates.length > 0);

  const setOpen = (next: boolean) =>
    setSearchParams(withTourParam(searchParams, next), {
      replace: true,
      state: location.state,
    });

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
        onClose={() => setOpen(false)}
        panelClassName="max-w-lg w-full max-h-[85vh]"
      >
        <ModalHeader
          title={artistName}
          subtitle="Tour dates"
          className="mb-4"
        />
        <div className="min-h-0 overflow-y-auto">
          <TourDatesBody live={live} />
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={`mt-4 w-full ${SECONDARY_BUTTON}`}
        >
          Close
        </button>
      </Modal>
    </>
  );
}
