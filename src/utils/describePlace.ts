import type { GeocodedPlace } from "@/types";

/** "Malmö, Skåne County, Sweden": how a picked place is shown and stored. */
export function describePlace(place: GeocodedPlace): string {
  return [place.name, place.region, place.country].filter(Boolean).join(", ");
}
