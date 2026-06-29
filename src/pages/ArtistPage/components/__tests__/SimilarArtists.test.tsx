import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SimilarArtists from "../SimilarArtists";
import type { SimilarArtist } from "@/hooks/useSimilarArtists";

vi.mock("@/components/FollowArtistButton", () => ({
  default: ({ artistMbid }: { artistMbid: string }) => (
    <button data-testid={`follow-${artistMbid}`}>Follow</button>
  ),
}));

const artists: SimilarArtist[] = [
  { name: "Muse", mbid: "muse-1", imageUrl: "", match: 0.9 },
  { name: "Coldplay", mbid: "cold-1", imageUrl: "", match: 0.8 },
];

function renderSection(props: Parameters<typeof SimilarArtists>[0]) {
  return render(
    <MemoryRouter>
      <SimilarArtists {...props} />
    </MemoryRouter>
  );
}

describe("SimilarArtists", () => {
  it("renders the heading and each artist", () => {
    renderSection({
      artists,
      loading: false,
      isArtistInLibrary: () => false,
    });

    expect(screen.getByText("Similar artists")).toBeInTheDocument();
    expect(screen.getByText("Muse")).toBeInTheDocument();
    expect(screen.getByText("Coldplay")).toBeInTheDocument();
  });

  it("marks artists that are in the library", () => {
    renderSection({
      artists,
      loading: false,
      isArtistInLibrary: (mbid) => mbid === "cold-1",
    });

    const badges = screen.getAllByLabelText("In Library");
    expect(badges).toHaveLength(1);
  });

  it("renders skeletons while loading", () => {
    renderSection({
      artists: [],
      loading: true,
      isArtistInLibrary: () => false,
    });

    expect(screen.getByText("Similar artists")).toBeInTheDocument();
    expect(
      document.querySelectorAll(".animate-shimmer").length
    ).toBeGreaterThan(0);
  });

  it("renders nothing when not loading and there are no artists", () => {
    const { container } = renderSection({
      artists: [],
      loading: false,
      isArtistInLibrary: () => false,
    });

    expect(container).toBeEmptyDOMElement();
  });
});
