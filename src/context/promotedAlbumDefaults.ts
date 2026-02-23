import type { PromotedAlbumSettings } from "./lidarrContextDef";

export const DEFAULT_PROMOTED_ALBUM: PromotedAlbumSettings = {
  cacheDurationMinutes: 30,
  topArtistsCount: 10,
  pickedArtistsCount: 3,
  tagsPerArtist: 5,
  deepPageMin: 2,
  deepPageMax: 10,
  genericTags: [
    "seen live",
    "favorites",
    "favourite",
    "my favorite",
    "love",
    "awesome",
    "beautiful",
    "cool",
    "check out",
    "spotify",
    "under 2000 listeners",
    "all",
  ],
  libraryPreference: "prefer_new",
};
