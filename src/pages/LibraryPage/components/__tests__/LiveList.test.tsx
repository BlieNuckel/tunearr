import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LiveList from "../LiveList";
import type { LiveEventSummary, LiveTourSummary } from "@/types";

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
    ticketUrl: "https://tickets.test/100",
    imageUrl: null,
    distanceKm: null,
    performers: [
      { jambaseId: "jambase:1", name: "Yves Tumor", isHeadliner: true },
    ],
    response: null,
    viewedAt: null,
    ...overrides,
  };
}

function tour(overrides: Partial<LiveTourSummary> = {}): LiveTourSummary {
  return {
    artistMbid: "mbid-yves",
    artistName: "Yves Tumor",
    dateCount: 12,
    closest: event(),
    distanceKm: 2.4,
    ...overrides,
  };
}

type Bodies = { tours?: unknown; going?: unknown; ok?: boolean };

function mockFetch({ tours, going, ok = true }: Bodies) {
  const fetchMock = vi.fn().mockImplementation(async (url: string) => ({
    ok,
    json: async () =>
      url === "/api/live/tours"
        ? (tours ?? { hasLocation: true, tours: [] })
        : (going ?? { events: [] }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderList() {
  return render(
    <MemoryRouter>
      <LiveList />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("LiveList upcoming", () => {
  it("lists one row per artist leading with the closest date", async () => {
    mockFetch({
      tours: {
        hasLocation: true,
        tours: [
          tour(),
          tour({
            artistMbid: "mbid-bar",
            artistName: "bar italia",
            dateCount: 1,
            distanceKm: 615,
          }),
        ],
      },
    });
    renderList();

    const rows = await screen.findAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(
      within(rows[0]).getByRole("link", { name: "Yves Tumor" })
    ).toHaveAttribute("href", "/artist/mbid-yves");
    expect(
      within(rows[0]).getByText("Closest of 12 dates · 2 km away")
    ).toBeInTheDocument();
    expect(
      within(rows[1]).getByText("Only date announced · 615 km away")
    ).toBeInTheDocument();
  });

  it("says it shows the next date and links to the location setting without a location", async () => {
    mockFetch({
      tours: { hasLocation: false, tours: [tour({ distanceKm: null })] },
    });
    renderList();

    expect(await screen.findByText("Next of 12 dates")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Set your location" })
    ).toHaveAttribute("href", "/settings/general");
  });

  it("does not ask for a location when there is one", async () => {
    mockFetch({ tours: { hasLocation: true, tours: [tour()] } });
    renderList();

    await screen.findByText("Yves Tumor");
    expect(
      screen.queryByRole("link", { name: "Set your location" })
    ).not.toBeInTheDocument();
  });

  it("badges a closest date the user is going to, or one that moved", async () => {
    mockFetch({
      tours: {
        hasLocation: true,
        tours: [
          tour({ closest: event({ response: "going", status: "postponed" }) }),
        ],
      },
    });
    renderList();

    const row = await screen.findByRole("listitem");
    expect(within(row).getByText("Going")).toBeInTheDocument();
    expect(within(row).getByText("Postponed")).toBeInTheDocument();
  });

  it("says when no followed artist is touring", async () => {
    mockFetch({});
    renderList();

    expect(
      await screen.findByText("No artists you follow have upcoming dates")
    ).toBeInTheDocument();
  });

  it("surfaces a load failure", async () => {
    mockFetch({ ok: false });
    renderList();

    expect(
      await screen.findByText("Could not load live dates")
    ).toBeInTheDocument();
  });
});

describe("LiveList going", () => {
  it("lists each show the user is going to", async () => {
    const fetchMock = mockFetch({
      going: {
        events: [
          event({ response: "going" }),
          event({
            eventKey: "jambase:200",
            status: "cancelled",
            response: "going",
            ticketUrl: null,
          }),
        ],
      },
    });
    renderList();

    await userEvent.click(screen.getByRole("button", { name: "Going" }));

    const rows = await screen.findAllByRole("listitem");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/live/going",
      expect.anything()
    );
    expect(rows).toHaveLength(2);
    expect(
      within(rows[0]).getByRole("link", { name: "Tickets" })
    ).toBeInTheDocument();
    expect(within(rows[1]).getByText("Cancelled")).toBeInTheDocument();
    expect(within(rows[1]).queryByRole("link")).not.toBeInTheDocument();
  });

  it("does not repeat the going badge on every row", async () => {
    mockFetch({ going: { events: [event({ response: "going" })] } });
    renderList();

    await userEvent.click(screen.getByRole("button", { name: "Going" }));

    const row = await screen.findByRole("listitem");
    expect(within(row).queryByText("Going")).not.toBeInTheDocument();
  });

  it("says when nothing is marked going", async () => {
    mockFetch({});
    renderList();

    await userEvent.click(screen.getByRole("button", { name: "Going" }));

    expect(
      await screen.findByText("You haven't marked any shows as going")
    ).toBeInTheDocument();
  });

  it("marks the active view for assistive tech", async () => {
    mockFetch({});
    renderList();

    expect(screen.getByRole("button", { name: "Upcoming" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await userEvent.click(screen.getByRole("button", { name: "Going" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Going" })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
    );
  });
});
