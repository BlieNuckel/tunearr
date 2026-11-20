import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetPrefs = vi.fn();
const mockSetPrefs = vi.fn();

vi.mock("../../db/liveEvents", () => ({
  getUserLivePreferences: (...args: unknown[]) => mockGetPrefs(...args),
  setUserLivePreferences: (...args: unknown[]) => mockSetPrefs(...args),
}));

const { parseLocation, readLivePreferences, writeLivePreferences } =
  await import("./preferences");

const MALMO = { lat: 55.605, lon: 13.0038 };

const NO_LOCATION = { live_lat: null, live_lon: null, live_place: null };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPrefs.mockResolvedValue(NO_LOCATION);
  mockSetPrefs.mockResolvedValue(undefined);
});

describe("readLivePreferences", () => {
  it("reports no location until the user sets one", async () => {
    expect(await readLivePreferences(1)).toEqual({ location: null });
  });

  it("reports the location and the place it was picked as", async () => {
    mockGetPrefs.mockResolvedValue({
      live_lat: MALMO.lat,
      live_lon: MALMO.lon,
      live_place: "Malmö, Skåne, Sweden",
    });

    expect(await readLivePreferences(1)).toEqual({
      location: { ...MALMO, place: "Malmö, Skåne, Sweden" },
    });
  });

  it("treats half a coordinate as no location", async () => {
    mockGetPrefs.mockResolvedValue({ ...NO_LOCATION, live_lat: 55.6 });
    expect(await readLivePreferences(1)).toEqual({ location: null });
  });

  it("is a 404 for an unknown user", async () => {
    mockGetPrefs.mockResolvedValue(null);
    await expect(readLivePreferences(9)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("writeLivePreferences", () => {
  it("stores a picked place", async () => {
    await writeLivePreferences(1, {
      location: { ...MALMO, place: "  Malmö, Skåne, Sweden " },
    });

    expect(mockSetPrefs).toHaveBeenCalledWith(1, {
      live_lat: MALMO.lat,
      live_lon: MALMO.lon,
      live_place: "Malmö, Skåne, Sweden",
    });
  });

  it("stores bare coordinates from the browser without a place", async () => {
    await writeLivePreferences(1, { location: MALMO });

    expect(mockSetPrefs).toHaveBeenCalledWith(1, {
      live_lat: MALMO.lat,
      live_lon: MALMO.lon,
      live_place: null,
    });
  });

  it("clears the location with null", async () => {
    await writeLivePreferences(1, { location: null });

    expect(mockSetPrefs).toHaveBeenCalledWith(1, {
      live_lat: null,
      live_lon: null,
      live_place: null,
    });
  });

  it("answers with what was saved", async () => {
    mockGetPrefs.mockResolvedValue({
      live_lat: MALMO.lat,
      live_lon: MALMO.lon,
      live_place: null,
    });

    expect(await writeLivePreferences(1, { location: MALMO })).toEqual({
      location: { ...MALMO, place: null },
    });
  });

  it("rejects a save without a location", async () => {
    await expect(writeLivePreferences(1, {})).rejects.toMatchObject({
      status: 400,
    });
    expect(mockSetPrefs).not.toHaveBeenCalled();
  });
});

describe("parseLocation", () => {
  it("accepts the edges of the globe", () => {
    expect(parseLocation({ lat: -90, lon: 180 })).toEqual({
      lat: -90,
      lon: 180,
      place: null,
    });
  });

  it("rejects coordinates that cannot exist", () => {
    for (const bad of [
      { lat: 91, lon: 0 },
      { lat: 0, lon: -181 },
      { lat: "55", lon: 13 },
      { lat: Number.NaN, lon: 13 },
      { lat: 55 },
      "Malmö",
    ]) {
      expect(() => parseLocation(bad)).toThrow();
    }
  });

  it("rejects a place that is not text", () => {
    expect(() => parseLocation({ ...MALMO, place: 7 })).toThrow(
      "place must be text"
    );
  });

  it("drops an empty place and caps a long one", () => {
    expect(parseLocation({ ...MALMO, place: "   " })?.place).toBeNull();
    expect(
      parseLocation({ ...MALMO, place: "x".repeat(500) })?.place
    ).toHaveLength(200);
  });
});
