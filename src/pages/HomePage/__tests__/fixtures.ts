import type { Mock } from "vitest";
import type {
  LiveEventSummary,
  LiveHighlight,
  ReleaseHighlight,
  RequestHighlight,
} from "@/types";
import type { HighlightHandlers } from "../types";

type MockHandlers = {
  [K in keyof HighlightHandlers]: Mock<HighlightHandlers[K]>;
};

export function releaseHighlight(
  overrides: Partial<ReleaseHighlight> = {}
): ReleaseHighlight {
  return {
    kind: "release",
    key: "release:1",
    followedReleaseId: 1,
    releaseGroupMbid: "rg-1",
    title: "Heaven to a Tortured Mind",
    artistName: "Yves Tumor",
    artistMbid: "mbid-yves",
    releaseDate: "2026-11-15",
    releaseType: "Album",
    coverUrl: "https://caa.test/rg-1.jpg",
    lidarrStatus: null,
    unseen: true,
    ...overrides,
  };
}

export function liveEvent(
  overrides: Partial<LiveEventSummary> = {}
): LiveEventSummary {
  return {
    id: 100,
    eventKey: "jambase:100",
    name: "Yves Tumor at Amiralen",
    eventDate: "2026-11-25",
    previousStartDate: null,
    status: "scheduled",
    statusChangedAt: null,
    venueName: "Amiralen",
    venueCity: "Malmö",
    venueCountry: "SE",
    ticketUrl: "https://tickets.test/100",
    imageUrl: "https://img.test/100.jpg",
    distanceKm: null,
    performers: [
      { jambaseId: "jambase:1", name: "Yves Tumor", isHeadliner: true },
    ],
    response: null,
    viewedAt: null,
    ...overrides,
  };
}

export function liveHighlight(
  overrides: Partial<LiveHighlight> = {}
): LiveHighlight {
  return {
    kind: "live",
    key: "live:mbid-yves",
    id: 5,
    artistMbid: "mbid-yves",
    artistName: "Yves Tumor",
    dateCount: 12,
    closest: liveEvent(),
    distanceKm: 2.4,
    hasLocation: true,
    notifiedAt: null,
    change: null,
    ...overrides,
  };
}

export function requestHighlight(
  overrides: Partial<RequestHighlight> = {}
): RequestHighlight {
  return {
    kind: "request",
    key: "request:9",
    requestId: 9,
    albumMbid: "rg-9",
    title: "Dummy",
    artistName: "Portishead",
    coverUrl: "https://caa.test/rg-9.jpg",
    availableAt: "2026-11-18T09:00:00",
    ...overrides,
  };
}

export function handlers(): MockHandlers {
  return { onDismiss: vi.fn(), onGoing: vi.fn(), onOpenRelease: vi.fn() };
}
