import { useState } from "react";
import { MusicalNoteIcon, TicketIcon } from "@/components/icons";
import ImageWithShimmer from "@/components/ImageWithShimmer";
import { TONE_FILL } from "../styles";
import type { HighlightView } from "../types";

interface HighlightArtworkProps {
  view: HighlightView;
  className?: string;
}

/** Fills its box, cropping the image rather than letterboxing it. */
export default function HighlightArtwork({
  view,
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
