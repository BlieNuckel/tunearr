import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListCandidates = vi.fn();

vi.mock("../liveEvents/notice", () => ({
  listNoticeCandidates: (...args: unknown[]) => mockListCandidates(...args),
}));

import { listLiveHighlights } from "./live";
import { TIER_FRESH, TIER_STANDING, TIER_URGENT } from "./rank";

const NOW = Date.parse("2026-11-18T12:00:00.000Z");
const NOW_ISO = new Date(NOW).toISOString();

function candidate(overrides: Record<string, unknown> = {}) {
  const { event: eventOverrides, ...rest } = overrides as {
    event?: Record<string, unknown>;
  };
  return {
    tier: "local",
    reason: "coming-up",
    distanceKm: 2.4,
    score: 1200,
    event: {
      id: 5,
      event_key: "jambase:100",
      name: "Yves Tumor at Amiralen",
      event_date: "2026-11-25",
      previous_start_date: null,
      event_status: "scheduled",
      status_changed_at: null,
      first_seen_at: "2026-10-01T00:00:00.000Z",
      venue_name: "Amiralen",
      venue_city: "Malmö",
      venue_country: "SE",
      ticket_url: "https://tickets.test/100",
      image_url: "https://img.test/100.jpg",
      performers: [
        {
          artist_jambase_id: "jambase:1",
          artist_name: "Yves Tumor",
          is_headliner: true,
        },
      ],
      state: null,
      ...eventOverrides,
    },
    ...rest,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListCandidates.mockResolvedValue([]);
});

describe("listLiveHighlights", () => {
  it("asks for the user's notices at the given time", async () => {
    await listLiveHighlights(7, NOW);
    expect(mockListCandidates).toHaveBeenCalledWith(7, NOW);
  });

  it("serializes the event with its tier and reason", async () => {
    mockListCandidates.mockResolvedValue([candidate()]);

    const [entry] = await listLiveHighlights(7, NOW);

    expect(entry.highlight).toMatchObject({
      kind: "live",
      key: "live:5",
      id: 5,
      name: "Yves Tumor at Amiralen",
      eventDate: "2026-11-25",
      venueCity: "Malmö",
      imageUrl: "https://img.test/100.jpg",
      tier: "local",
      reason: "coming-up",
      distanceKm: 2.4,
      performers: [
        { jambaseId: "jambase:1", name: "Yves Tumor", isHeadliner: true },
      ],
    });
  });

  it("ranks a changed date as urgent, from when it changed", async () => {
    mockListCandidates.mockResolvedValue([
      candidate({
        reason: "status-changed",
        tier: "regional",
        event: {
          event_status: "cancelled",
          status_changed_at: "2026-11-17T00:00:00.000Z",
        },
      }),
    ]);

    const [entry] = await listLiveHighlights(7, NOW);

    expect(entry.tier).toBe(TIER_URGENT);
    expect(entry.at).toBe("2026-11-17T00:00:00.000Z");
  });

  it("ranks a newly announced nearby show as fresh", async () => {
    mockListCandidates.mockResolvedValue([
      candidate({ tier: "local", reason: "just-announced" }),
      candidate({
        tier: "regional",
        reason: "just-announced",
        event: { id: 6 },
      }),
    ]);

    const result = await listLiveHighlights(7, NOW);

    expect(result.map((r) => r.tier)).toEqual([TIER_FRESH, TIER_STANDING]);
  });

  it("ranks a reminder about a known show below news", async () => {
    mockListCandidates.mockResolvedValue([
      candidate({ tier: "local", reason: "coming-up" }),
    ]);

    const [entry] = await listLiveHighlights(7, NOW);

    expect(entry.tier).toBe(TIER_STANDING);
  });

  it("dates a new announcement by when it was first seen", async () => {
    mockListCandidates.mockResolvedValue([
      candidate({ reason: "just-announced" }),
    ]);

    const [entry] = await listLiveHighlights(7, NOW);

    expect(entry.at).toBe("2026-10-01T00:00:00.000Z");
  });

  it("treats a show that is coming up as news now", async () => {
    mockListCandidates.mockResolvedValue([candidate({ reason: "coming-up" })]);

    const [entry] = await listLiveHighlights(7, NOW);

    expect(entry.at).toBe(NOW_ISO);
  });
});
