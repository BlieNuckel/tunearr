import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  initializeDatabase,
  closeDatabase,
  getDataSource,
} from "../../db/index";
import {
  BERLIN,
  COPENHAGEN,
  MALMO,
  NOW,
  artistState,
  changeStatus,
  createUser,
  follow,
  locate,
  markGoing,
  sweep,
} from "../liveEvents/__fixtures__/tours";
import { TIER_FRESH, TIER_STANDING, TIER_URGENT } from "./rank";

const mockNotifyTour = vi.fn();

vi.mock("../notifications", () => ({
  notifyTourUpdate: (...args: unknown[]) => mockNotifyTour(...args),
  notifyLiveStatusChange: vi.fn(),
}));

const { listLiveHighlights, dismissLiveHighlight } = await import("./live");
const { notifyLiveUpdates } = await import("../liveEvents/notifier");

const DAY = 86_400_000;

let userId: number;

beforeEach(async () => {
  vi.clearAllMocks();
  mockNotifyTour.mockResolvedValue(undefined);
  await initializeDatabase(":memory:");
  userId = await createUser("lasse");
  await follow(userId, "a");
  await locate(userId, MALMO);
});

afterEach(async () => {
  await closeDatabase();
});

describe("listLiveHighlights", () => {
  it("shows one card per touring artist, leading with the closest date", async () => {
    await sweep([
      { key: "a1", artist: "a", date: "2026-12-10", at: BERLIN },
      { key: "a2", artist: "a", date: "2027-01-10", at: COPENHAGEN },
    ]);

    const [card, ...rest] = await listLiveHighlights(userId, NOW);

    expect(rest).toEqual([]);
    expect(card.tier).toBe(TIER_STANDING);
    expect(card.highlight).toMatchObject({
      kind: "live",
      key: "live:mbid-a",
      artistMbid: "mbid-a",
      artistName: "a",
      dateCount: 2,
      closest: { eventKey: "a2" },
      hasLocation: true,
      change: null,
    });
    expect(card.highlight.distanceKm).toBeLessThan(40);
  });

  it("shows nothing for a followed artist with no dates", async () => {
    expect(await listLiveHighlights(userId, NOW)).toEqual([]);
  });

  it("shows a new follow's card at once and records it without notifying", async () => {
    await sweep([{ key: "a1", artist: "a", date: "2026-12-10" }]);

    const cards = await listLiveHighlights(userId, NOW);
    await notifyLiveUpdates(NOW);

    expect(cards).toHaveLength(1);
    expect(cards[0].highlight.id).toBe((await artistState(userId, "a"))?.id);
    expect(mockNotifyTour).not.toHaveBeenCalled();
  });

  it("never swallows news the next sweep should send", async () => {
    await notifyLiveUpdates(NOW);
    await sweep([{ key: "a1", artist: "a", date: "2026-12-10" }]);

    await listLiveHighlights(userId, NOW + DAY);
    await notifyLiveUpdates(NOW + DAY);

    expect(mockNotifyTour).toHaveBeenCalledTimes(1);
  });

  it("ranks an artist as fresh for two weeks after new dates are announced", async () => {
    await notifyLiveUpdates(NOW);
    await sweep([{ key: "a1", artist: "a", date: "2027-01-10" }]);
    await notifyLiveUpdates(NOW + DAY);

    const [fresh] = await listLiveHighlights(userId, NOW + 2 * DAY);
    const [stale] = await listLiveHighlights(userId, NOW + 16 * DAY);

    expect(fresh.tier).toBe(TIER_FRESH);
    expect(stale.tier).toBe(TIER_STANDING);
  });

  it("says when there is no location, so the card can show the soonest date", async () => {
    await locate(userId, null);
    await sweep([{ key: "a1", artist: "a", date: "2026-12-10" }]);

    const [card] = await listLiveHighlights(userId, NOW);

    expect(card.highlight).toMatchObject({
      hasLocation: false,
      distanceKm: null,
    });
  });
});

describe("dismissal", () => {
  beforeEach(async () => {
    await sweep([{ key: "a1", artist: "a", date: "2026-12-10", at: BERLIN }]);
  });

  it("hides the artist until a closer date is announced", async () => {
    const [card] = await listLiveHighlights(userId, NOW);

    expect(await dismissLiveHighlight(userId, card.highlight.id, NOW)).toBe(
      true
    );
    expect(await listLiveHighlights(userId, NOW)).toEqual([]);

    await sweep([
      { key: "a2", artist: "a", date: "2027-01-10", at: COPENHAGEN },
    ]);
    await notifyLiveUpdates(NOW + DAY);

    expect(await listLiveHighlights(userId, NOW + DAY)).toHaveLength(1);
  });

  it("stays hidden when a farther date is added", async () => {
    const [card] = await listLiveHighlights(userId, NOW);
    await dismissLiveHighlight(userId, card.highlight.id, NOW);

    await sweep([{ key: "a2", artist: "a", date: "2027-01-10", at: BERLIN }]);
    await notifyLiveUpdates(NOW + DAY);

    expect(await listLiveHighlights(userId, NOW + DAY)).toEqual([]);
  });

  it("refuses another user's card", async () => {
    const [card] = await listLiveHighlights(userId, NOW);
    const other = await createUser("someone");

    expect(await dismissLiveHighlight(other, card.highlight.id, NOW)).toBe(
      false
    );
  });
});

describe("changes to shows the user is going to", () => {
  beforeEach(async () => {
    await sweep([
      { key: "a1", artist: "a", date: "2026-12-10" },
      { key: "a2", artist: "a", date: "2026-12-20" },
    ]);
    await markGoing(userId, "a1");
    await changeStatus("a1", "postponed", new Date(NOW - DAY).toISOString());
  });

  it("puts the change at the top, even for a dismissed artist", async () => {
    await listLiveHighlights(userId, NOW);
    await getDataSource().query(
      "UPDATE user_live_artist_state SET dismissed_at = ? WHERE user_id = ?",
      [new Date(NOW).toISOString(), userId]
    );

    const [card] = await listLiveHighlights(userId, NOW);

    expect(card.tier).toBe(TIER_URGENT);
    expect(card.highlight.change).toMatchObject({
      eventKey: "a1",
      status: "postponed",
    });
  });

  it("acknowledges the change on dismissal", async () => {
    const [card] = await listLiveHighlights(userId, NOW);

    await dismissLiveHighlight(userId, card.highlight.id, NOW);

    expect(await listLiveHighlights(userId, NOW)).toEqual([]);
  });

  it("still shows a cancelled show the user was going to after the rest of the tour is gone", async () => {
    await changeStatus(
      "a2",
      "cancelled",
      new Date(NOW - 2 * DAY).toISOString()
    );
    await changeStatus("a1", "cancelled", new Date(NOW - DAY).toISOString());

    const [card] = await listLiveHighlights(userId, NOW);

    expect(card.highlight).toMatchObject({
      closest: null,
      dateCount: 0,
      change: { eventKey: "a1", status: "cancelled" },
    });
  });
});
