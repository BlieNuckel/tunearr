import { render, screen } from "@testing-library/react";
import CardHand from "../components/CardHand";
import type { CollectedAlbum } from "@/hooks/useExploration";

vi.mock("@/components/ImageWithShimmer", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

function makeAlbum(id: string, title: string): CollectedAlbum {
  return {
    releaseGroup: {
      id,
      score: 100,
      title,
      "primary-type": "Album",
      "first-release-date": "2020-01-01",
      "artist-credit": [
        { name: "Artist", artist: { id: "art-1", name: "Artist" } },
      ],
    },
  };
}

describe("CardHand", () => {
  it("renders nothing when no albums", () => {
    const { container } = render(<CardHand albums={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders correct number of album cards", () => {
    const albums = [
      makeAlbum("1", "Album A"),
      makeAlbum("2", "Album B"),
      makeAlbum("3", "Album C"),
    ];
    render(<CardHand albums={albums} />);
    expect(screen.getByTestId("card-hand")).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(3);
  });

  it("shows numbered badges on cards", () => {
    const albums = [
      makeAlbum("1", "Album A"),
      makeAlbum("2", "Album B"),
    ];
    render(<CardHand albums={albums} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders mobile pill bar", () => {
    const albums = [makeAlbum("1", "Album A")];
    render(<CardHand albums={albums} />);
    const pill = screen.getByTestId("card-hand").querySelector(".rounded-full");
    expect(pill).toBeInTheDocument();
  });
});
