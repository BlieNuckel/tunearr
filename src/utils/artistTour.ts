/** The artist page opens its tour dates modal when this query param is "1". */
export const TOUR_PARAM = "tour";

/** The artist page, landing on the tour dates rather than the top. */
export function artistTourPath(artistMbid: string): string {
  return `/artist/${artistMbid}?${TOUR_PARAM}=1`;
}
