import { formatDate, headliner, venueLine, whereAndWhen } from "../liveFormat";
import type { LiveEventSummary } from "@/types";

function event(overrides: Partial<LiveEventSummary> = {}): LiveEventSummary {
  return {
    id: 1,
    eventKey: "jambase:100",
    name: "Show",
    eventDate: "2026-09-05",
    previousStartDate: null,
    status: "scheduled",
    statusChangedAt: null,
    venueName: "Amiralen",
    venueCity: "Malmö",
    venueCountry: "SE",
    ticketUrl: null,
    imageUrl: null,
    distanceKm: null,
    performers: [],
    response: null,
    viewedAt: null,
    ...overrides,
  };
}

describe("venueLine", () => {
  it("joins venue, city and country", () => {
    expect(venueLine(event())).toBe("Amiralen, Malmö, SE");
  });

  it("skips the parts that are unknown", () => {
    expect(venueLine(event({ venueName: null, venueCountry: null }))).toBe(
      "Malmö"
    );
  });
});

describe("whereAndWhen", () => {
  it("puts the place before the date", () => {
    expect(whereAndWhen(event())).toBe(
      `Amiralen, Malmö, SE · ${formatDate("2026-09-05")}`
    );
  });

  it("shows only the date when the place is unknown", () => {
    expect(
      whereAndWhen(
        event({ venueName: null, venueCity: null, venueCountry: null })
      )
    ).toBe(formatDate("2026-09-05"));
  });
});

describe("formatDate", () => {
  it("returns the input when it is not a date", () => {
    expect(formatDate("soon")).toBe("soon");
  });
});

describe("headliner", () => {
  it("prefers the headliner, then the first performer, then the event name", () => {
    const a = { jambaseId: "a", name: "A", isHeadliner: false };
    const b = { jambaseId: "b", name: "B", isHeadliner: true };
    expect(headliner(event({ performers: [a, b] }))).toBe("B");
    expect(headliner(event({ performers: [a] }))).toBe("A");
    expect(headliner(event())).toBe("Show");
  });
});
