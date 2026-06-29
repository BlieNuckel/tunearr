import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PromotedArtists from "../PromotedArtists";
import type { PromotedArtistsData } from "@/hooks/usePromotedArtists";

const data: PromotedArtistsData = {
  artists: [
    {
      name: "Boards of Canada",
      mbid: "boc-1",
      imageUrl: "",
      match: 0.8,
      inLibrary: false,
    },
    { name: "Tycho", mbid: "ty-1", imageUrl: "", match: 0.7, inLibrary: true },
  ],
  seedArtists: ["Aphex Twin", "Plaid"],
};

function renderSection(props: Parameters<typeof PromotedArtists>[0]) {
  return render(
    <MemoryRouter>
      <PromotedArtists {...props} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("PromotedArtists", () => {
  it("renders the section heading", () => {
    renderSection({ data, loading: false, onRefresh: vi.fn() });
    expect(screen.getByText("Artists you might like")).toBeInTheDocument();
  });

  it("renders each recommended artist", () => {
    renderSection({ data, loading: false, onRefresh: vi.fn() });
    expect(screen.getByText("Boards of Canada")).toBeInTheDocument();
    expect(screen.getByText("Tycho")).toBeInTheDocument();
  });

  it("renders the seed-artist explanation", () => {
    renderSection({ data, loading: false, onRefresh: vi.fn() });
    expect(
      screen.getByText("Because you listen to Aphex Twin and Plaid")
    ).toBeInTheDocument();
  });

  it("renders nothing when not loading and there are no artists", () => {
    const { container } = renderSection({
      data: { artists: [], seedArtists: [] },
      loading: false,
      onRefresh: vi.fn(),
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders skeletons while loading", () => {
    renderSection({ data: null, loading: true, onRefresh: vi.fn() });
    expect(screen.getByText("Artists you might like")).toBeInTheDocument();
    expect(screen.queryByText("Because you listen to")).not.toBeInTheDocument();
  });

  it("calls onRefresh after the shuffle animation", () => {
    const onRefresh = vi.fn();
    renderSection({ data, loading: false, onRefresh });

    fireEvent.click(screen.getByLabelText("Shuffle recommended artists"));
    expect(onRefresh).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onRefresh).toHaveBeenCalled();
  });
});
