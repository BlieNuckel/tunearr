import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import HighlightCard from "../HighlightCard";

const mockUseImageHue = vi.fn();

vi.mock("@/hooks/useImageHue", () => ({
  default: (url: string | null) => mockUseImageHue(url),
}));
import type { Highlight } from "@/types";
import {
  handlers,
  liveHighlight,
  releaseHighlight,
} from "../../__tests__/fixtures";

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

function renderCard(
  highlight: Highlight,
  layout: "row" | "stack" = "row",
  cardHandlers = handlers()
) {
  render(
    <MemoryRouter>
      <Routes>
        <Route
          path="/"
          element={
            <HighlightCard
              highlight={highlight}
              handlers={cardHandlers}
              layout={layout}
            />
          }
        />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
  return cardHandlers;
}

beforeEach(() => {
  mockUseImageHue.mockReset();
  mockUseImageHue.mockReturnValue(null);
});

describe("HighlightCard surface", () => {
  it("takes a muted version of the cover's colour", () => {
    mockUseImageHue.mockReturnValue({ hue: 225, saturation: 0.5 });
    renderCard(releaseHighlight());

    const card = screen.getByRole("article");
    expect(mockUseImageHue).toHaveBeenCalledWith("https://caa.test/rg-1.jpg");
    expect(card.style.getPropertyValue("--album-surface")).toBe(
      "hsl(225 30% 88%)"
    );
    expect(card.style.getPropertyValue("--album-surface-dark")).toBe(
      "hsl(225 23% 20%)"
    );
    expect(card).toHaveClass("bg-(--album-surface)");
  });

  it("keeps the release colour until the cover's colour is known", () => {
    renderCard(releaseHighlight());
    expect(screen.getByRole("article")).toHaveClass("bg-amber-100");
  });

  it("never tints a live card from its photo", () => {
    mockUseImageHue.mockReturnValue({ hue: 225, saturation: 0.5 });
    renderCard(liveHighlight());

    expect(mockUseImageHue).toHaveBeenCalledWith(null);
  });
});

describe("HighlightCard for a release", () => {
  it("shows what was released and by whom", () => {
    renderCard(releaseHighlight());

    expect(
      screen.getByRole("article", {
        name: "New album: Heaven to a Tortured Mind",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Heaven to a Tortured Mind" })
    ).toBeInTheDocument();
    expect(screen.getByText("Yves Tumor")).toBeInTheDocument();
    expect(
      screen.getByAltText("Heaven to a Tortured Mind cover art")
    ).toBeInTheDocument();
  });

  it("opens the album and marks the release seen", async () => {
    const release = releaseHighlight();
    const cardHandlers = renderCard(release);

    await userEvent.click(screen.getByRole("link", { name: "View album" }));

    expect(cardHandlers.onOpenRelease).toHaveBeenCalledWith(release);
    expect(screen.getByTestId("location")).toHaveTextContent("/album/rg-1");
  });

  it("searches for a release MusicBrainz has not matched yet", async () => {
    renderCard(releaseHighlight({ releaseGroupMbid: null }));

    await userEvent.click(screen.getByRole("link", { name: "Find album" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/search?q=Yves%20Tumor%20Heaven%20to%20a%20Tortured%20Mind"
    );
  });

  it("says when the album is already in the library", () => {
    renderCard(releaseHighlight({ lidarrStatus: "imported" }));
    expect(screen.getByText("In your library")).toBeInTheDocument();
  });

  it("dismisses the release", async () => {
    const release = releaseHighlight();
    const cardHandlers = renderCard(release);

    await userEvent.click(
      screen.getByRole("button", {
        name: "Dismiss Heaven to a Tortured Mind",
      })
    );

    expect(cardHandlers.onDismiss).toHaveBeenCalledWith(release);
  });

  it("draws an icon when there is no cover", () => {
    renderCard(releaseHighlight({ coverUrl: null }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("HighlightCard for a live date", () => {
  it("shows the headliner, venue and a ticket link", () => {
    renderCard(liveHighlight());

    expect(
      screen.getByRole("heading", { name: "Yves Tumor" })
    ).toBeInTheDocument();
    expect(screen.getByText("Live near you")).toBeInTheDocument();
    expect(screen.getByText("Amiralen, Malmö · 2 km away")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tickets" })).toHaveAttribute(
      "href",
      "https://tickets.test/100"
    );
  });

  it("records going", async () => {
    const live = liveHighlight();
    const cardHandlers = renderCard(live);

    await userEvent.click(screen.getByRole("button", { name: "Going" }));

    expect(cardHandlers.onGoing).toHaveBeenCalledWith(live);
  });

  it("leaves out tickets when there is no link", () => {
    renderCard(liveHighlight({ ticketUrl: null }));

    expect(
      screen.queryByRole("link", { name: "Tickets" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Going" })).toBeInTheDocument();
  });

  it("only offers to acknowledge a cancelled show", async () => {
    const live = liveHighlight({
      status: "cancelled",
      reason: "status-changed",
    });
    const cardHandlers = renderCard(live);

    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Tickets" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Going" })
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Got it" }));

    expect(cardHandlers.onDismiss).toHaveBeenCalledWith(live);
  });

  it("renders the same content stacked for mobile", () => {
    renderCard(liveHighlight(), "stack");

    expect(
      screen.getByRole("heading", { name: "Yves Tumor" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Going" })).toBeInTheDocument();
  });
});
