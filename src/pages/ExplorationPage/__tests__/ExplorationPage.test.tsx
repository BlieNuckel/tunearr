import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockStartExploration = vi.fn();
const mockSelectSuggestion = vi.fn();
const mockReset = vi.fn();

let mockPhase = "search";
let mockRound = 0;
let mockCollectedAlbums: unknown[] = [];

vi.mock("@/hooks/useExploration", () => ({
  default: () => ({
    phase: mockPhase,
    round: mockRound,
    collectedAlbums: mockCollectedAlbums,
    suggestions: [],
    accumulatedTags: [],
    loading: false,
    error: null,
    startExploration: mockStartExploration,
    selectSuggestion: mockSelectSuggestion,
    reset: mockReset,
  }),
}));

vi.mock("../components/SourceSearch", () => ({
  default: () => <div data-testid="source-search">Source Search</div>,
}));

vi.mock("../components/ExplorationArena", () => ({
  default: () => <div data-testid="exploration-arena">Arena</div>,
}));

vi.mock("../components/CompletionScreen", () => ({
  default: () => <div data-testid="completion-screen">Complete</div>,
}));

import ExplorationPage from "../ExplorationPage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/explore"]}>
      <ExplorationPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockPhase = "search";
  mockRound = 0;
  mockCollectedAlbums = [];
  vi.clearAllMocks();
});

describe("ExplorationPage", () => {
  it("renders source search in search phase", () => {
    renderPage();
    expect(screen.getByTestId("source-search")).toBeInTheDocument();
  });

  it("renders arena in round phase", () => {
    mockPhase = "round";
    mockRound = 1;
    renderPage();
    expect(screen.getByTestId("exploration-arena")).toBeInTheDocument();
  });

  it("renders completion screen in complete phase", () => {
    mockPhase = "complete";
    renderPage();
    expect(screen.getByTestId("completion-screen")).toBeInTheDocument();
  });

  it("renders back link to home", () => {
    renderPage();
    const backLink = screen.getByText("Back");
    expect(backLink.closest("a")).toHaveAttribute("href", "/");
  });

  it("renders page title in non-search phases", () => {
    mockPhase = "round";
    mockRound = 1;
    renderPage();
    expect(screen.getByText("Explore")).toBeInTheDocument();
  });

  it("hides page title in search phase (hero title is in SourceSearch)", () => {
    renderPage();
    expect(screen.queryByText("Explore")).not.toBeInTheDocument();
  });
});
