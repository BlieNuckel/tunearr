import type { Highlight, LiveHighlight, ReleaseHighlight } from "@/types";
import type { AlbumLibraryState } from "@shared/albumLibrary";

/** Colour family a highlight is drawn in; also tells urgent news apart. */
export type HighlightTone =
  "release" | "request" | "live" | "alert" | "warning";

export type HighlightView = {
  eyebrow: string;
  tone: HighlightTone;
  title: string;
  subtitle: string;
  details: string[];
  artworkUrl: string | null;
  artworkAlt: string;
  /** An album cover tints its card with its own colour; an event photo does not. */
  artworkKind: "cover" | "photo";
  library: { state: AlbumLibraryState; label: string } | null;
};

export type HighlightHandlers = {
  onDismiss: (highlight: Highlight) => void;
  onGoing: (highlight: LiveHighlight) => void;
  onOpenRelease: (highlight: ReleaseHighlight) => void;
};
