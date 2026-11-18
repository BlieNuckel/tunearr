import Spinner from "./Spinner";
import type { ErrorKind } from "@/utils/fetchError";

/** The slice of a `useAsyncData`-based hook a section needs to show its state. */
export type SectionState = {
  loading: boolean;
  error: string | null;
  errorKind: ErrorKind | null;
  retrying: boolean;
  refresh: () => Promise<void>;
};

interface SectionStatusProps {
  /** What failed to load, for the copy: "this album", "the tracklist". */
  subject: string;
  error: string | null;
  errorKind: ErrorKind | null;
  retrying: boolean;
  onRetry?: () => void;
  className?: string;
}

function messageFor(kind: ErrorKind | null, subject: string): string {
  if (kind === "notFound") return `MusicBrainz has no record of ${subject}.`;
  if (kind === "busy") {
    return `MusicBrainz is still busy, so we couldn't load ${subject}. Try again in a moment.`;
  }
  return `We couldn't load ${subject}.`;
}

/**
 * One section's failure state. While a busy MusicBrainz is being retried it
 * says so; once retries run out it offers a manual retry. Not found gets no
 * retry, since asking again won't change the answer.
 */
export default function SectionStatus({
  subject,
  error,
  errorKind,
  retrying,
  onRetry,
  className = "",
}: SectionStatusProps) {
  if (retrying) {
    return (
      <div
        role="status"
        className={`flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ${className}`}
      >
        <Spinner className="w-4 h-4" />
        MusicBrainz is busy, retrying…
      </div>
    );
  }

  if (!error) return null;

  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 ${className}`}
    >
      <span>{messageFor(errorKind, subject)}</span>
      {errorKind !== "notFound" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1 bg-amber-300 hover:bg-amber-200 text-black font-bold rounded-lg text-xs border-2 border-black shadow-cartoon-sm active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
        >
          Try again
        </button>
      )}
    </div>
  );
}
