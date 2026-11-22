import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import ArtistTour from "../ArtistTour";
import type { ArtistLiveDatesState } from "@/hooks/useArtistLiveDates";
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
    venueName: "Berghain",
    venueCity: "Berlin",
    venueCountry: "DE",
    ticketUrl: "https://tickets.test/100",
    imageUrl: null,
    distanceKm: null,
    performers: [],
    response: null,
    viewedAt: null,
    ...overrides,
  };
}

function live(overrides: Partial<ArtistLiveDatesState> = {}) {
  return {
    dates: [],
    tracking: "tracked" as const,
    loading: false,
    error: null,
    refreshSoon: vi.fn(),
    ...overrides,
  };
}

function LocationProbe() {
  const location = useLocation();
  return (
    <>
      <span data-testid="search">{location.search}</span>
      <span data-testid="state">{JSON.stringify(location.state)}</span>
    </>
  );
}

type Entry = { pathname: string; search?: string; state?: unknown };

function TourAt({
  entry,
  state,
}: {
  entry: Entry;
  state: ArtistLiveDatesState;
}) {
  return (
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          path="/artist/:mbid"
          element={
            <>
              <ArtistTour artistName="Yves Tumor" live={state} />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

function renderTour(
  state: ArtistLiveDatesState,
  entry: Entry = { pathname: "/artist/a1" }
) {
  const view = render(<TourAt entry={entry} state={state} />);
  return {
    ...view,
    rerenderWith: (next: ArtistLiveDatesState) =>
      view.rerender(<TourAt entry={entry} state={next} />),
  };
}

/** jsdom never ends the CSS animation, so a closed modal stays mounted on its way out. */
function expectClosing() {
  expect(screen.getByTestId("modal-backdrop")).toHaveClass(
    "animate-backdrop-out"
  );
}

describe("ArtistTour", () => {
  it("shows no button when there are no dates", () => {
    renderTour(live({ tracking: "unavailable" }));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("counts the dates on the button", () => {
    renderTour(
      live({ dates: [event({ eventKey: "a" }), event({ eventKey: "b" })] })
    );
    expect(
      screen.getByRole("button", { name: "2 tour dates" })
    ).toBeInTheDocument();
  });

  it("uses the singular for one date", () => {
    renderTour(live({ dates: [event()] }));
    expect(
      screen.getByRole("button", { name: "1 tour date" })
    ).toBeInTheDocument();
  });

  it("keeps the modal closed until the button is pressed", () => {
    renderTour(live({ dates: [event()] }));
    expect(screen.queryByTestId("modal-backdrop")).not.toBeInTheDocument();
  });

  it("opens the dates under the artist's name", () => {
    renderTour(live({ dates: [event()] }));

    fireEvent.click(screen.getByRole("button", { name: "1 tour date" }));

    expect(
      screen.getByRole("heading", { name: "Yves Tumor" })
    ).toBeInTheDocument();
    expect(screen.getByText("Berghain, Berlin, DE")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tickets" })).toBeInTheDocument();
  });

  it("closes from the Close button", () => {
    renderTour(live({ dates: [event()] }));
    fireEvent.click(screen.getByRole("button", { name: "1 tour date" }));

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expectClosing();
  });

  it("closes from the backdrop", () => {
    renderTour(live({ dates: [event()] }));
    fireEvent.click(screen.getByRole("button", { name: "1 tour date" }));

    fireEvent.click(screen.getByTestId("modal-backdrop"));

    expectClosing();
  });

  it("keeps the open modal in the URL, keeping the nav state", () => {
    renderTour(live({ dates: [event()] }), {
      pathname: "/artist/a1",
      state: { preview: "kept" },
    });

    fireEvent.click(screen.getByRole("button", { name: "1 tour date" }));
    expect(screen.getByTestId("search")).toHaveTextContent("?tour=1");
    expect(screen.getByTestId("state")).toHaveTextContent('{"preview":"kept"}');

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByTestId("search")).toHaveTextContent(/^$/);
  });

  describe("deep link", () => {
    const deepLink = { pathname: "/artist/a1", search: "?tour=1" };

    it("opens the modal from ?tour=1", () => {
      renderTour(live({ dates: [event()] }), deepLink);
      expect(screen.getByText("Berghain, Berlin, DE")).toBeInTheDocument();
    });

    it("waits for the dates before opening", () => {
      const { rerenderWith } = renderTour(live({ loading: true }), deepLink);
      expect(screen.queryByTestId("modal-backdrop")).not.toBeInTheDocument();

      rerenderWith(live({ dates: [event()] }));

      expect(screen.getByText("Berghain, Berlin, DE")).toBeInTheDocument();
    });

    it("explains an empty list rather than opening on nothing", () => {
      renderTour(live({ tracking: "pending" }), deepLink);
      expect(screen.getByText("Checking for live dates…")).toBeInTheDocument();
    });

    it("says when the dates could not be loaded", () => {
      renderTour(live({ tracking: null, error: "boom" }), deepLink);
      expect(screen.getByText("Could not load live dates")).toBeInTheDocument();
    });

    it("stays open while the dates are refetched", () => {
      const { rerenderWith } = renderTour(live({ dates: [event()] }), deepLink);

      rerenderWith(live({ dates: [event()], loading: true }));

      expect(screen.getByTestId("modal-backdrop")).not.toHaveClass(
        "animate-backdrop-out"
      );
    });

    it("drops the param on close, keeping the other params and nav state", () => {
      renderTour(live({ dates: [event()] }), {
        pathname: "/artist/a1",
        search: "?tour=1&from=home",
        state: { preview: "kept" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Close" }));

      expect(screen.getByTestId("search")).toHaveTextContent("?from=home");
      expect(screen.getByTestId("state")).toHaveTextContent(
        '{"preview":"kept"}'
      );
      expectClosing();
    });

    it("ignores other values of the param", () => {
      renderTour(live({ dates: [event()] }), {
        pathname: "/artist/a1",
        search: "?tour=0",
      });
      expect(screen.queryByTestId("modal-backdrop")).not.toBeInTheDocument();
    });
  });
});
