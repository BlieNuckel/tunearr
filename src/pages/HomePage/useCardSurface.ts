import type { CSSProperties } from "react";
import useImageHue from "@/hooks/useImageHue";
import { albumSurface } from "@/utils/imageColor";
import type { HighlightView } from "./types";

export type CardSurface = {
  className: string;
  style?: CSSProperties;
};

const ALBUM_SURFACE_CLASS =
  "bg-(--album-surface) dark:bg-(--album-surface-dark)";

/**
 * A card with an album cover takes a muted version of the cover's colour.
 * Until that colour is known, or when there is no cover, `fallback` applies.
 */
export default function useCardSurface(
  view: HighlightView,
  fallback: string
): CardSurface {
  const hue = useImageHue(
    view.artworkKind === "cover" ? view.artworkUrl : null
  );
  if (!hue) return { className: fallback };

  const surface = albumSurface(hue);
  return {
    className: ALBUM_SURFACE_CLASS,
    style: {
      "--album-surface": surface.light,
      "--album-surface-dark": surface.dark,
    } as CSSProperties,
  };
}
