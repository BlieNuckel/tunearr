import { describeHighlight, headliner } from "../highlightView";
import { liveHighlight, releaseHighlight, requestHighlight } from "./fixtures";

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

describe("describeHighlight for a live date", () => {
  it("describes a nearby show by its headliner", () => {
    const view = describeHighlight(liveHighlight(), NOW);

    expect(view).toMatchObject({
      eyebrow: "Live near you",
      tone: "live",
      title: "Yves Tumor",
      details: ["Amiralen, Malmö · 2 km away"],
      artworkUrl: "https://img.test/100.jpg",
      artworkAlt: "Yves Tumor at Amiralen",
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

  it("names the country for a show that needs travel", () => {
    const view = describeHighlight(
      liveHighlight({ tier: "regional", venueCountry: "DK", distanceKm: 40 }),
      NOW
    );

    expect(view.eyebrow).toBe("Live within reach");
    expect(view.details).toEqual(["Amiralen, Malmö, DK"]);
  });

  it("calls out a show that was just announced", () => {
    expect(
      describeHighlight(liveHighlight({ reason: "just-announced" }), NOW)
        .eyebrow
    ).toBe("Just announced");
  });

  it("gives only the distance when the venue is unknown", () => {
    expect(
      describeHighlight(
        liveHighlight({ venueName: null, venueCity: null }),
        NOW
      ).details
    ).toEqual(["2 km away"]);
  });

  it("leads with a cancellation", () => {
    const view = describeHighlight(
      liveHighlight({ status: "cancelled", reason: "status-changed" }),
      NOW
    );
    expect(view.eyebrow).toBe("Cancelled");
    expect(view.tone).toBe("alert");
  });

  it("says where a rescheduled show moved from", () => {
    const view = describeHighlight(
      liveHighlight({
        status: "rescheduled",
        reason: "status-changed",
        previousStartDate: "2026-11-20",
      }),
      NOW
    );

    expect(view.eyebrow).toBe("Rescheduled");
    expect(view.tone).toBe("warning");
    expect(view.details[1]).toMatch(/^Moved from /);
  });

  it("marks a postponed show as a warning", () => {
    expect(
      describeHighlight(liveHighlight({ status: "postponed" }), NOW).tone
    ).toBe("warning");
  });
});

describe("headliner", () => {
  it("prefers the headliner, then the first performer, then the event name", () => {
    expect(headliner(liveHighlight())).toBe("Yves Tumor");
    expect(
      headliner(
        liveHighlight({
          performers: [
            { jambaseId: "j:2", name: "Opener", isHeadliner: false },
          ],
        })
      )
    ).toBe("Opener");
    expect(headliner(liveHighlight({ performers: [] }))).toBe(
      "Yves Tumor at Amiralen"
    );
  });
});
