import LiveBannerSection from "./components/sections/LiveBannerSection";
import NewReleasesSection from "./components/sections/NewReleasesSection";
import type { SectionDefinition } from "./types";

/**
 * The Discover page section registry — the single place to add, remove,
 * resize, or reorder sections. Spans target the 6-column desktop grid;
 * mobileOrder controls the single-column stack independently.
 *
 * Grid rows are a fixed height, so a span is a contract: a tile gets exactly the
 * rows it asks for and no more. The unit is small on purpose, so a one-line
 * widget can be one row while a shelf takes three. See {@link SectionSpan}.
 */
export const SECTION_DEFINITIONS: readonly SectionDefinition[] = [
  {
    id: "liveBanner",
    span: { cols: 6, rows: 1 },
    desktopOrder: 1,
    mobileOrder: 1,
    whenEmpty: "hide",
    Component: LiveBannerSection,
  },
  {
    id: "newReleases",
    span: { cols: 6, rows: 3 },
    desktopOrder: 2,
    mobileOrder: 2,
    whenEmpty: "hide",
    Component: NewReleasesSection,
  },
];
