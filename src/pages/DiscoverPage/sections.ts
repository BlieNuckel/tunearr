import ArtistsSection from "./components/sections/ArtistsSection";
import SpotlightSection from "./components/sections/SpotlightSection";
import type { SectionDefinition } from "./types";

/**
 * The Discover page section registry — the single place to add, remove,
 * resize, or reorder sections. Spans target the 6-column desktop grid;
 * mobileOrder controls the single-column stack independently.
 */
export const SECTION_DEFINITIONS: readonly SectionDefinition[] = [
  {
    id: "spotlight",
    span: { cols: 6, rows: 1 },
    desktopOrder: 1,
    mobileOrder: 1,
    whenEmpty: "hide",
    Component: SpotlightSection,
  },
  {
    id: "artists",
    span: { cols: 6, rows: 1 },
    desktopOrder: 2,
    mobileOrder: 2,
    whenEmpty: "hide",
    Component: ArtistsSection,
  },
];
