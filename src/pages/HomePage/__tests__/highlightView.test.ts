import { describeHighlight, liveEventOf } from "../highlightView";
import {
  liveEvent,
  liveHighlight,
  releaseHighlight,
  requestHighlight,
} from "./fixtures";

const NOW = Date.parse("2026-11-18T12:00:00");

describe("describeHighlight for a release", () => {
  it("describes a new album by its artist", () => {
    expect(describeHighlight(releaseHighlight(), NOW)).toEqual({
      eyebrow: "New album",
      tone: "release",
      title: "Heaven to a Tortured Mind",
      subtitle: "Yves Tumor",
      details: ["Released 3 days ago"],
      artworkUrl: "https://caa.test/rg-1.jpg",
      artworkAlt: "Heaven to a Tortured Mind cover art",
      artworkKind: "cover",
      library: null,
    });
  });

  it.each([
    ["EP", "New EP"],
    ["Single", "New single"],
    [null, "New release"],
    ["Other", "New release"],
  ])("labels a %s as %s", (releaseType, eyebrow) => {
    expect(
      describeHighlight(releaseHighlight({ releaseType }), NOW).eyebrow
    ).toBe(eyebrow);
  });

  it("says when it came out today", () => {
    expect(
      describeHighlight(releaseHighlight({ releaseDate: "2026-11-18" }), NOW)
        .details
    ).toEqual(["Released today"]);
  });

  it.each([
    ["imported", "complete", "In your library"],
    ["downloading", "partial", "Downloading"],
    ["wanted", "requested", "Requested"],
  ] as const)("reports a %s release as %s", (lidarrStatus, state, label) => {
    expect(
      describeHighlight(releaseHighlight({ lidarrStatus }), NOW).library
    ).toEqual({ state, label });
  });
});

describe("describeHighlight for an arrived request", () => {
  it("tells the requester their album is here", () => {
    expect(describeHighlight(requestHighlight(), NOW)).toEqual({
      eyebrow: "Your request is here",
      tone: "request",
      title: "Dummy",
      subtitle: "Portishead",
      details: ["Added to your library today"],
      artworkUrl: "https://caa.test/rg-9.jpg",
      artworkAlt: "Dummy cover art",
      artworkKind: "cover",
      library: null,
    });
  });

  it("says how long ago it arrived", () => {
    expect(
      describeHighlight(
        requestHighlight({ availableAt: "2026-11-16T09:00:00" }),
        NOW
      ).details
    ).toEqual(["Added to your library 2 days ago"]);
  });
});

describe("describeHighlight for a touring artist", () => {
  it("leads with the closest date and how far away it is", () => {
    const view = describeHighlight(liveHighlight(), NOW);

    expect(view).toMatchObject({
      eyebrow: "On tour",
      tone: "live",
      title: "Yves Tumor",
      details: ["Amiralen, Malmö, SE · 2 km away", "Closest of 12 dates"],
      artworkUrl: "https://img.test/100.jpg",
      artworkAlt: "Yves Tumor",
      artworkKind: "photo",
      library: null,
    });
    expect(view.subtitle).toBe(
      new Date("2026-11-25T00:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    );
  });

  it("calls dates announced in the last two weeks new", () => {
    const view = describeHighlight(
      liveHighlight({ notifiedAt: "2026-11-10T12:00:00.000Z" }),
      NOW
    );
    expect(view.eyebrow).toBe("New tour dates");
  });

  it("stops calling them new after two weeks", () => {
    const view = describeHighlight(
      liveHighlight({ notifiedAt: "2026-11-01T12:00:00.000Z" }),
      NOW
    );
    expect(view.eyebrow).toBe("On tour");
  });

  it("calls it the next date when there is no distance to go by", () => {
    const view = describeHighlight(
      liveHighlight({ distanceKm: null, hasLocation: false }),
      NOW
    );
    expect(view.details).toEqual([
      "Amiralen, Malmö, SE",
      "Next of 12 dates",
      "Set your location in Settings to see the closest",
    ]);
  });

  it("leaves out the location prompt once the user has one, even when the venue cannot be measured", () => {
    const view = describeHighlight(
      liveHighlight({ distanceKm: null, hasLocation: true }),
      NOW
    );
    expect(view.details).toEqual(["Amiralen, Malmö, SE", "Next of 12 dates"]);
  });

  it("says when a date is the only one", () => {
    expect(
      describeHighlight(liveHighlight({ dateCount: 1 }), NOW).details[1]
    ).toBe("Only date announced");
  });

  it("gives only the distance when the venue is unknown", () => {
    const view = describeHighlight(
      liveHighlight({
        closest: liveEvent({
          venueName: null,
          venueCity: null,
          venueCountry: null,
        }),
      }),
      NOW
    );
    expect(view.details[0]).toBe("2 km away");
  });
});

describe("describeHighlight for a change to a show the user is going to", () => {
  it("leads with a cancellation", () => {
    const view = describeHighlight(
      liveHighlight({ change: liveEvent({ status: "cancelled" }) }),
      NOW
    );
    expect(view.eyebrow).toBe("Cancelled");
    expect(view.tone).toBe("alert");
    expect(view.details).toEqual(["Amiralen, Malmö, SE"]);
  });

  it("says where a rescheduled show moved from", () => {
    const view = describeHighlight(
      liveHighlight({
        change: liveEvent({
          status: "rescheduled",
          previousStartDate: "2026-11-20",
          eventDate: "2026-12-01",
        }),
      }),
      NOW
    );

    expect(view.eyebrow).toBe("Rescheduled");
    expect(view.tone).toBe("warning");
    expect(view.details[1]).toMatch(/^Moved from /);
    expect(view.subtitle).toBe(
      new Date("2026-12-01T00:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    );
  });

  it("marks a postponed show as a warning", () => {
    expect(
      describeHighlight(
        liveHighlight({ change: liveEvent({ status: "postponed" }) }),
        NOW
      ).tone
    ).toBe("warning");
  });
});

describe("liveEventOf", () => {
  it("is the change when there is one, else the closest date", () => {
    const change = liveEvent({ id: 7, status: "postponed" });
    expect(liveEventOf(liveHighlight())).toMatchObject({ id: 100 });
    expect(liveEventOf(liveHighlight({ change }))).toBe(change);
  });
});
