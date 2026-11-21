import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindGoingForUser = vi.fn();
const mockListTouringArtists = vi.fn();
const mockSetUserResponse = vi.fn();
const mockMarkViewed = vi.fn();
const mockFindEventsForArtist = vi.fn();
const mockFindJambaseId = vi.fn();
const mockReadPreferences = vi.fn();
const mockWritePreferences = vi.fn();
const mockSearchPlaces = vi.fn();
const mockCountLiveTracking = vi.fn();
const mockGetArtistLiveTracking = vi.fn();

vi.mock("../db/liveEvents", () => ({
  findGoingForUser: (...args: unknown[]) => mockFindGoingForUser(...args),
  setUserResponse: (...args: unknown[]) => mockSetUserResponse(...args),
  markViewed: (...args: unknown[]) => mockMarkViewed(...args),
  findEventsForArtist: (...args: unknown[]) => mockFindEventsForArtist(...args),
  findJambaseIdForArtistMbid: (...args: unknown[]) =>
    mockFindJambaseId(...args),
}));

vi.mock("../services/liveEvents/preferences", () => ({
  readLivePreferences: (...args: unknown[]) => mockReadPreferences(...args),
  writeLivePreferences: (...args: unknown[]) => mockWritePreferences(...args),
}));

vi.mock("../services/liveEvents/tours", () => ({
  listTouringArtists: (...args: unknown[]) => mockListTouringArtists(...args),
}));

vi.mock("../api/openMeteo/geocoding", () => ({
  searchPlaces: (...args: unknown[]) => mockSearchPlaces(...args),
}));

vi.mock("../services/liveEvents/tracking", () => ({
  countLiveTracking: () => mockCountLiveTracking(),
  getArtistLiveTracking: (...args: unknown[]) =>
    mockGetArtistLiveTracking(...args),
}));

const ADMIN_AND_REQUEST = 9;
const REQUEST_ONLY = 8;
let callerPermissions = ADMIN_AND_REQUEST;

vi.mock("../middleware/requireAuth", () => ({
  requireAuth: (req: { user: unknown }, _res: unknown, next: () => void) => {
    req.user = { id: 7, permissions: callerPermissions, username: "lasse" };
    next();
  },
}));

import express from "express";
import request from "supertest";
import liveRouter from "./live";
import { ApiError } from "../middleware/ApiError";

const app = express();
app.use(express.json());
app.use("/", liveRouter);
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    const status =
      err instanceof ApiError
        ? err.status
        : ((err as Error & { status?: number }).status ?? 500);
    res.status(status).json({ error: err.message });
  }
);

function storedEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    event_key: "jambase:100",
    name: "Yves Tumor at Amiralen",
    event_date: "2026-08-30",
    previous_start_date: null,
    event_status: "scheduled",
    status_changed_at: null,
    venue_name: "Amiralen",
    venue_city: "Malmö",
    venue_country: "SE",
    ticket_url: "https://tickets.test/100",
    image_url: null,
    distanceKm: 2.4,
    performers: [
      {
        artist_jambase_id: "jambase:1",
        artist_name: "Yves Tumor",
        is_headliner: true,
      },
    ],
    state: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  callerPermissions = ADMIN_AND_REQUEST;
  mockFindGoingForUser.mockResolvedValue([]);
  mockListTouringArtists.mockResolvedValue({ hasLocation: false, tours: [] });
  mockSetUserResponse.mockResolvedValue({});
  mockMarkViewed.mockResolvedValue({});
  mockFindEventsForArtist.mockResolvedValue([]);
  mockFindJambaseId.mockResolvedValue(null);
  mockGetArtistLiveTracking.mockResolvedValue(null);
  mockCountLiveTracking.mockResolvedValue({
    tracked: 0,
    pending: 0,
    unavailable: 0,
  });
  mockReadPreferences.mockResolvedValue({ location: null });
  mockWritePreferences.mockResolvedValue({ location: null });
});

describe("GET /tours", () => {
  it("returns one row per touring artist with the date to lead with", async () => {
    mockListTouringArtists.mockResolvedValue({
      hasLocation: true,
      tours: [
        {
          artistMbid: "mbid-yves",
          artistName: "Yves Tumor",
          jambaseArtistId: "jambase:1",
          dates: [storedEvent(), storedEvent({ id: 2 })],
          closest: storedEvent(),
          distanceKm: 2.4,
        },
      ],
    });

    const res = await request(app).get("/tours");

    expect(res.status).toBe(200);
    expect(mockListTouringArtists).toHaveBeenCalledWith(7);
    expect(res.body).toEqual({
      hasLocation: true,
      tours: [
        {
          artistMbid: "mbid-yves",
          artistName: "Yves Tumor",
          dateCount: 2,
          closest: expect.objectContaining({ eventKey: "jambase:100" }),
          distanceKm: 2.4,
        },
      ],
    });
  });
});

describe("GET /going", () => {
  it("returns the caller's going shows from today on", async () => {
    mockFindGoingForUser.mockResolvedValue([
      storedEvent({ state: { response: "going", viewed_at: null } }),
    ]);

    const res = await request(app).get("/going");

    expect(res.status).toBe(200);
    expect(res.body.events).toEqual([
      expect.objectContaining({ eventKey: "jambase:100", response: "going" }),
    ]);
    expect(mockFindGoingForUser).toHaveBeenCalledWith(
      7,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    );
  });
});

describe("POST /events/:id/response", () => {
  it("records going", async () => {
    const res = await request(app)
      .post("/events/12/response")
      .send({ response: "going" });

    expect(res.status).toBe(200);
    expect(mockSetUserResponse).toHaveBeenCalledWith(
      7,
      12,
      "going",
      expect.any(String)
    );
  });

  it("records a dismissal", async () => {
    await request(app)
      .post("/events/12/response")
      .send({ response: "dismissed" });
    expect(mockSetUserResponse).toHaveBeenCalledWith(
      7,
      12,
      "dismissed",
      expect.any(String)
    );
  });

  it("clears a response when given null", async () => {
    await request(app).post("/events/12/response").send({ response: null });
    expect(mockSetUserResponse).toHaveBeenCalledWith(
      7,
      12,
      null,
      expect.any(String)
    );
  });

  it("rejects an unknown response", async () => {
    const res = await request(app)
      .post("/events/12/response")
      .send({ response: "perhaps" });

    expect(res.status).toBe(400);
    expect(mockSetUserResponse).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric event id", async () => {
    const res = await request(app)
      .post("/events/abc/response")
      .send({ response: "going" });

    expect(res.status).toBe(400);
    expect(mockSetUserResponse).not.toHaveBeenCalled();
  });
});

describe("POST /events/:id/viewed", () => {
  it("marks the event seen for this user", async () => {
    const res = await request(app).post("/events/12/viewed");

    expect(res.status).toBe(200);
    expect(mockMarkViewed).toHaveBeenCalledWith(7, 12, expect.any(String));
  });

  it("rejects a bad id", async () => {
    const res = await request(app).post("/events/0/viewed");
    expect(res.status).toBe(400);
  });
});

describe("GET /artist/:mbid", () => {
  it("reports the tracking state alongside the dates", async () => {
    mockGetArtistLiveTracking.mockResolvedValue("unavailable");

    const res = await request(app).get("/artist/mbid-1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ events: [], liveTracking: "unavailable" });
    expect(mockGetArtistLiveTracking).toHaveBeenCalledWith("mbid-1");
  });

  it("reports null tracking for an artist nobody follows", async () => {
    const res = await request(app).get("/artist/mbid-1");
    expect(res.body.liveTracking).toBeNull();
  });

  it("keeps the tracking state on a response that does have dates", async () => {
    mockFindJambaseId.mockResolvedValue("jambase:1");
    mockGetArtistLiveTracking.mockResolvedValue("tracked");
    mockFindEventsForArtist.mockResolvedValue([storedEvent()]);

    const res = await request(app).get("/artist/mbid-1");

    expect(res.body.events).toHaveLength(1);
    expect(res.body.liveTracking).toBe("tracked");
  });

  it("returns the artist's dates once they have been resolved", async () => {
    mockFindJambaseId.mockResolvedValue("jambase:1");
    mockFindEventsForArtist.mockResolvedValue([storedEvent()]);

    const res = await request(app).get("/artist/mbid-yves");

    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(1);
    expect(mockFindEventsForArtist).toHaveBeenCalledWith(
      7,
      "jambase:1",
      expect.objectContaining({ includePast: false })
    );
  });

  it("returns an empty list rather than an error for an unresolved artist", async () => {
    mockFindJambaseId.mockResolvedValue(null);
    mockReadPreferences.mockResolvedValue({ location: null });
    mockWritePreferences.mockResolvedValue({ location: null });

    const res = await request(app).get("/artist/mbid-unknown");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ events: [], liveTracking: null });
    expect(mockFindEventsForArtist).not.toHaveBeenCalled();
  });

  it("passes includePast through", async () => {
    mockFindJambaseId.mockResolvedValue("jambase:1");
    await request(app).get("/artist/mbid-yves?includePast=true");

    expect(mockFindEventsForArtist).toHaveBeenCalledWith(
      7,
      "jambase:1",
      expect.objectContaining({ includePast: true })
    );
  });
});

describe("preferences", () => {
  it("returns the caller's location", async () => {
    mockReadPreferences.mockResolvedValue({
      location: { lat: 55.6, lon: 13, place: "Malmö" },
    });

    const res = await request(app).get("/preferences");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      location: { lat: 55.6, lon: 13, place: "Malmö" },
    });
    expect(mockReadPreferences).toHaveBeenCalledWith(7);
  });

  it("saves only the caller's own location", async () => {
    const res = await request(app)
      .patch("/preferences")
      .send({ location: { lat: 55.6, lon: 13, place: "Malmö" } });

    expect(res.status).toBe(200);
    expect(mockWritePreferences).toHaveBeenCalledWith(7, {
      location: { lat: 55.6, lon: 13, place: "Malmö" },
    });
  });

  it("surfaces a rejected location with its status", async () => {
    mockWritePreferences.mockRejectedValue(
      new ApiError(400, "That is not a valid coordinate")
    );

    const res = await request(app)
      .patch("/preferences")
      .send({ location: { lat: 99, lon: 0 } });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("coordinate");
  });
});

describe("GET /geocode", () => {
  it("hands back what the geocoder matched", async () => {
    mockSearchPlaces.mockResolvedValue([
      {
        name: "Malmö",
        region: "Skåne County",
        country: "Sweden",
        countryCode: "SE",
        latitude: 55.6059,
        longitude: 13.0007,
        population: 362133,
      },
    ]);

    const res = await request(app).get("/geocode?q=Malm%C3%B6");

    expect(res.status).toBe(200);
    expect(mockSearchPlaces).toHaveBeenCalledWith("Malmö");
    expect(res.body.places[0].name).toBe("Malmö");
  });

  it("lets every user look a place up, since everyone sets their own location", async () => {
    callerPermissions = REQUEST_ONLY;
    mockSearchPlaces.mockResolvedValue([]);

    const res = await request(app).get("/geocode?q=Lyon");

    expect(res.status).toBe(200);
    expect(mockSearchPlaces).toHaveBeenCalledWith("Lyon");
  });

  it("treats a missing query as an empty one rather than a 500", async () => {
    mockSearchPlaces.mockResolvedValue([]);

    const res = await request(app).get("/geocode");

    expect(res.status).toBe(200);
    expect(mockSearchPlaces).toHaveBeenCalledWith("");
    expect(res.body).toEqual({ places: [] });
  });
});

describe("GET /roster", () => {
  it("stays admin-only", async () => {
    callerPermissions = REQUEST_ONLY;

    const res = await request(app).get("/roster");

    expect(res.status).toBe(403);
    expect(mockCountLiveTracking).not.toHaveBeenCalled();
  });

  it("returns the counts per resolution state", async () => {
    mockCountLiveTracking.mockResolvedValue({
      tracked: 12,
      pending: 3,
      unavailable: 1,
    });

    const res = await request(app).get("/roster");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tracked: 12, pending: 3, unavailable: 1 });
  });
});
