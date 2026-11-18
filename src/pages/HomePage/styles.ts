import type { AlbumLibraryState } from "@shared/albumLibrary";
import type { HighlightTone } from "./types";

export const TONE_SURFACE: Record<HighlightTone, string> = {
  release: "bg-amber-100 dark:bg-gray-800",
  live: "bg-emerald-100 dark:bg-gray-800",
  alert: "bg-rose-100 dark:bg-gray-800",
  warning: "bg-orange-100 dark:bg-gray-800",
};

export const TONE_FILL: Record<HighlightTone, string> = {
  release: "bg-amber-200 dark:bg-amber-900/40",
  live: "bg-emerald-200 dark:bg-emerald-900/40",
  alert: "bg-rose-200 dark:bg-rose-900/40",
  warning: "bg-orange-200 dark:bg-orange-900/40",
};

export const TONE_DOT: Record<HighlightTone, string> = {
  release: "bg-amber-400",
  live: "bg-emerald-500",
  alert: "bg-rose-500",
  warning: "bg-orange-400",
};

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all";

export const PRIMARY_BUTTON = `${BUTTON_BASE} bg-amber-300 text-black`;

export const TICKET_BUTTON = `${BUTTON_BASE} bg-orange-400 text-black`;

export const SECONDARY_BUTTON = `${BUTTON_BASE} bg-white text-black dark:bg-gray-700 dark:text-gray-100`;

export const LIBRARY_PILL: Record<AlbumLibraryState, string> = {
  complete: "bg-amber-300 text-black",
  partial: "bg-amber-300 text-black",
  requested: "bg-gray-200 text-black dark:bg-gray-600 dark:text-white",
};
