import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Highlights from "../Highlights";
import { liveHighlight, releaseHighlight } from "../../__tests__/fixtures";

const mockUseHighlights = vi.fn();
const mockUseMediaQuery = vi.fn();

vi.mock("@/hooks/useHighlights", () => ({
  default: () => mockUseHighlights(),
}));

vi.mock("@/hooks/useMediaQuery", () => ({
  default: (query: string) => mockUseMediaQuery(query),
}));

const RELEASE = releaseHighlight();
const LIVE = liveHighlight();

function hookState(overrides: Record<string, unknown> = {}) {
  return {
    highlights: [RELEASE, LIVE],
    loading: false,
    error: null,
    errorKind: null,
    retrying: false,
    refresh: vi.fn(() => Promise.resolve()),
    dismiss: vi.fn(() => Promise.resolve()),
    markGoing: vi.fn(() => Promise.resolve()),
    markSeen: vi.fn(),
    ...overrides,
  };
}

function renderHighlights() {
  render(
    <MemoryRouter>
      <Highlights />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseMediaQuery.mockReturnValue(false);
});

describe("Highlights", () => {
  it("is labelled by its heading", () => {
    mockUseHighlights.mockReturnValue(hookState());
    renderHighlights();

    expect(
      screen.getByRole("region", { name: "Highlights" })
    ).toBeInTheDocument();
  });

  it("uses the spotlight layout from desktop width", () => {
    mockUseHighlights.mockReturnValue(hookState());
    mockUseMediaQuery.mockReturnValue(true);
    renderHighlights();

    expect(mockUseMediaQuery).toHaveBeenCalledWith("(min-width: 1024px)");
    expect(
      screen.getByRole("list", { name: "More highlights" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "1 of 2" })
    ).not.toBeInTheDocument();
  });

  it("uses the carousel below desktop width", () => {
    mockUseHighlights.mockReturnValue(hookState());
    renderHighlights();

    expect(screen.getByRole("group", { name: "1 of 2" })).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "More highlights" })
    ).not.toBeInTheDocument();
  });

  it("shows a placeholder while loading", () => {
    mockUseHighlights.mockReturnValue(
      hookState({ highlights: null, loading: true })
    );
    renderHighlights();

    expect(
      screen.getByRole("status", { name: "Loading highlights" })
    ).toBeInTheDocument();
  });

  it("offers a retry when loading failed", async () => {
    const state = hookState({
      highlights: null,
      error: "Failed to fetch highlights",
      errorKind: "server",
    });
    mockUseHighlights.mockReturnValue(state);
    renderHighlights();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't load your highlights."
    );
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(state.refresh).toHaveBeenCalled();
  });

  it("explains what will show up when there is nothing yet", () => {
    mockUseHighlights.mockReturnValue(hookState({ highlights: [] }));
    renderHighlights();

    expect(screen.getByText("Nothing new right now")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See who you follow" })
    ).toHaveAttribute("href", "/library/following");
  });

  it("wires the card actions to the hook", async () => {
    const state = hookState();
    mockUseHighlights.mockReturnValue(state);
    renderHighlights();

    await userEvent.click(
      screen.getByRole("button", { name: "Dismiss Heaven to a Tortured Mind" })
    );
    await userEvent.click(screen.getByRole("button", { name: "Going" }));
    await userEvent.click(screen.getByRole("link", { name: "View album" }));

    expect(state.dismiss).toHaveBeenCalledWith(RELEASE);
    expect(state.markGoing).toHaveBeenCalledWith(LIVE);
    expect(state.markSeen).toHaveBeenCalledWith(RELEASE);
  });
});
