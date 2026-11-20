import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initializeDatabase, closeDatabase } from "../../db/index";
import {
  BERLIN,
  COPENHAGEN,
  LYON,
  MALMO,
  NOW,
  artistState,
  changeStatus,
  createUser,
  follow,
  locate,
  markGoing,
  sweep,
  unfollow,
} from "./__fixtures__/tours";

const mockNotifyTour = vi.fn();
const mockNotifyStatus = vi.fn();

vi.mock("../notifications", () => ({
  notifyTourUpdate: (...args: unknown[]) => mockNotifyTour(...args),
  notifyLiveStatusChange: (...args: unknown[]) => mockNotifyStatus(...args),
}));

const { notifyLiveUpdates } = await import("./notifier");

const DAY = 86_400_000;

let userId: number;

beforeEach(async () => {
  vi.clearAllMocks();
  mockNotifyTour.mockResolvedValue(undefined);
  mockNotifyStatus.mockResolvedValue(undefined);
  await initializeDatabase(":memory:");
  userId = await createUser("lasse");
  await follow(userId, "a");
  await locate(userId, MALMO);
});

afterEach(async () => {
  await closeDatabase();
});

describe("first check", () => {
  it("records an artist's dates silently on rollout or a new follow", async () => {
    await sweep([{ key: "a1", artist: "a", date: "2026-12-10", at: BERLIN }]);

    const outcome = await notifyLiveUpdates(NOW);

    expect(outcome.tours).toBe(0);
    expect(mockNotifyTour).not.toHaveBeenCalled();
    expect(await artistState(userId, "a")).toMatchObject({
      closest_event_id: expect.any(Number),
      notified_at: null,
    });
  });

  it("records 'checked, no dates' for a followed artist not touring", async () => {
    await notifyLiveUpdates(NOW);

    expect(await artistState(userId, "a")).toMatchObject({
      closest_event_id: null,
    });
  });
});

describe("announcements", () => {
  it("notifies once per artist when one with no dates announces a tour", async () => {
    await notifyLiveUpdates(NOW);
    await sweep([
      { key: "a1", artist: "a", date: "2026-12-10", at: LYON, city: "Lyon" },
      { key: "a2", artist: "a", date: "2026-12-12", at: BERLIN },
      { key: "a3", artist: "a", date: "2027-01-02", at: BERLIN },
    ]);

    const outcome = await notifyLiveUpdates(NOW + DAY);

    expect(outcome.tours).toBe(1);
    expect(mockNotifyTour).toHaveBeenCalledTimes(1);
    expect(mockNotifyTour).toHaveBeenCalledWith({
      userId,
      artistName: "a",
      artistMbid: "mbid-a",
      change: "announced",
      dateCount: 3,
      place: "Venue a2, Somewhere",
      eventDate: "2026-12-12",
      distanceKm: expect.any(Number),
    });
  });

  it("does not repeat itself on the next sweep", async () => {
    await notifyLiveUpdates(NOW);
    await sweep([{ key: "a1", artist: "a", date: "2026-12-10", at: BERLIN }]);
    await notifyLiveUpdates(NOW + DAY);
    await notifyLiveUpdates(NOW + 2 * DAY);

    expect(mockNotifyTour).toHaveBeenCalledTimes(1);
  });

  it("notifies again for a closer date, and clears a Highlights dismissal", async () => {
    await sweep([{ key: "a1", artist: "a", date: "2026-12-10", at: BERLIN }]);
    await notifyLiveUpdates(NOW);
    await sweep([
      { key: "a2", artist: "a", date: "2027-02-01", at: COPENHAGEN },
    ]);

    await notifyLiveUpdates(NOW + DAY);

    expect(mockNotifyTour).toHaveBeenCalledTimes(1);
    expect(mockNotifyTour.mock.calls[0][0]).toMatchObject({
      change: "closer",
      eventDate: "2027-02-01",
    });
    expect(await artistState(userId, "a")).toMatchObject({
      dismissed_at: null,
      notified_at: expect.any(String),
    });
  });

  it("stays quiet about a later leg further away", async () => {
    await sweep([
      { key: "a1", artist: "a", date: "2026-12-10", at: COPENHAGEN },
    ]);
    await notifyLiveUpdates(NOW);
    await sweep([{ key: "a2", artist: "a", date: "2027-02-01", at: LYON }]);

    await notifyLiveUpdates(NOW + DAY);

    expect(mockNotifyTour).not.toHaveBeenCalled();
  });

  it("re-records silently when the user moves", async () => {
    await sweep([
      { key: "a1", artist: "a", date: "2026-12-10", at: BERLIN },
      { key: "a2", artist: "a", date: "2026-12-11", at: LYON },
    ]);
    await notifyLiveUpdates(NOW);
    await locate(userId, LYON);

    await notifyLiveUpdates(NOW + DAY);

    expect(mockNotifyTour).not.toHaveBeenCalled();
    expect(await artistState(userId, "a")).toMatchObject({
      origin_lat: LYON.lat,
    });
  });

  it("re-records silently once the known closest date is cancelled", async () => {
    await sweep([
      { key: "a1", artist: "a", date: "2026-12-10", at: COPENHAGEN },
      { key: "a2", artist: "a", date: "2026-12-11", at: BERLIN },
    ]);
    await notifyLiveUpdates(NOW);
    await changeStatus("a1", "cancelled", new Date(NOW).toISOString());

    await notifyLiveUpdates(NOW + DAY);

    expect(mockNotifyTour).not.toHaveBeenCalled();
  });

  it("notifies first dates for a user without a location, leading with the soonest", async () => {
    await locate(userId, null);
    await notifyLiveUpdates(NOW);
    await sweep([
      { key: "a1", artist: "a", date: "2027-01-10", at: COPENHAGEN },
      { key: "a2", artist: "a", date: "2026-12-10", at: LYON },
    ]);

    await notifyLiveUpdates(NOW + DAY);

    expect(mockNotifyTour.mock.calls[0][0]).toMatchObject({
      eventDate: "2026-12-10",
      distanceKm: null,
    });
  });

  it("forgets an unfollowed artist, so following again starts silently", async () => {
    await notifyLiveUpdates(NOW);
    await unfollow(userId, "a");
    await notifyLiveUpdates(NOW + DAY);
    expect(await artistState(userId, "a")).toBeNull();

    await follow(userId, "a");
    await sweep([{ key: "a1", artist: "a", date: "2026-12-10" }]);
    await notifyLiveUpdates(NOW + 2 * DAY);

    expect(mockNotifyTour).not.toHaveBeenCalled();
  });

  it("keeps going for other users when one fails", async () => {
    const other = await createUser("someone");
    await follow(other, "b");
    await notifyLiveUpdates(NOW);
    await sweep([
      { key: "a1", artist: "a", date: "2026-12-10" },
      { key: "b1", artist: "b", date: "2026-12-10" },
    ]);
    mockNotifyTour.mockRejectedValueOnce(new Error("push failed"));

    await notifyLiveUpdates(NOW + DAY);

    expect(mockNotifyTour).toHaveBeenCalledTimes(2);
  });
});

describe("status changes", () => {
  beforeEach(async () => {
    await sweep([{ key: "a1", artist: "a", date: "2026-12-10" }]);
    await notifyLiveUpdates(NOW);
  });

  it("tells a user who marked the show going, once", async () => {
    await markGoing(userId, "a1");
    await changeStatus("a1", "postponed", new Date(NOW + DAY).toISOString());

    await notifyLiveUpdates(NOW + 2 * DAY);
    await notifyLiveUpdates(NOW + 3 * DAY);

    expect(mockNotifyStatus).toHaveBeenCalledTimes(1);
    expect(mockNotifyStatus).toHaveBeenCalledWith({
      userId,
      artistName: "a",
      place: "Venue a1, Somewhere",
      eventDate: "2026-12-10",
      status: "postponed",
    });
  });

  it("does not tell a user who never said they were going", async () => {
    await changeStatus("a1", "cancelled", new Date(NOW + DAY).toISOString());

    await notifyLiveUpdates(NOW + 2 * DAY);

    expect(mockNotifyStatus).not.toHaveBeenCalled();
  });

  it("treats a change older than two weeks as history", async () => {
    await markGoing(userId, "a1");
    await changeStatus(
      "a1",
      "cancelled",
      new Date(NOW - 15 * DAY).toISOString()
    );

    await notifyLiveUpdates(NOW);

    expect(mockNotifyStatus).not.toHaveBeenCalled();
  });
});
