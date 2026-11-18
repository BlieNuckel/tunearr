import { useState } from "react";
import { MusicalNoteIcon, TicketIcon } from "@/components/icons";
import ImageWithShimmer from "@/components/ImageWithShimmer";
import { TONE_FILL } from "../styles";
import type { HighlightView } from "../types";

interface HighlightArtworkProps {
  view: HighlightView;
  /**
   * Shows a square cover whole inside a wider frame, over a blurred copy of
   * itself, instead of cropping it to the frame.
   */
  framed?: boolean;
  className?: string;
}

export default function HighlightArtwork({
  view,
  framed = false,
  className = "",
}: HighlightArtworkProps) {
  const [failed, setFailed] = useState(false);
  const Icon = view.artworkKind === "cover" ? MusicalNoteIcon : TicketIcon;

  if (!view.artworkUrl || failed) {
    return (
      <div
        className={`flex items-center justify-center ${TONE_FILL[view.tone]} ${className}`}
      >
        <Icon className="w-1/4 max-w-12 min-w-6 aspect-square text-black/40 dark:text-white/40" />
      </div>
    );
  }

  if (framed && view.artworkKind === "cover") {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center ${TONE_FILL[view.tone]} ${className}`}
      >
        <img
          src={view.artworkUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-60"
        />
        <ImageWithShimmer
          src={view.artworkUrl}
          alt={view.artworkAlt}
          wrapperClassName="relative h-[80%] aspect-square rounded-lg border-2 border-black shadow-cartoon-md overflow-hidden"
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${TONE_FILL[view.tone]} ${className}`}>
      <ImageWithShimmer
        src={view.artworkUrl}
        alt={view.artworkAlt}
        wrapperClassName="w-full h-full"
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
