import { render, screen, fireEvent } from "@testing-library/react";
import SuggestionCard from "../components/SuggestionCard";
import type { ReleaseGroup } from "@/types";

vi.mock("@/components/ImageWithShimmer", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const releaseGroup: ReleaseGroup = {
  id: "rg-1",
  score: 100,
  title: "Test Album",
  "primary-type": "Album",
  "first-release-date": "2020-01-01",
  "artist-credit": [
    { name: "Test Artist", artist: { id: "art-1", name: "Test Artist" } },
  ],
};

describe("SuggestionCard", () => {
  it("renders tag chips, title, and artist", () => {
    render(
      <SuggestionCard releaseGroup={releaseGroup} tags={["rock", "indie"]} onClick={vi.fn()} />
    );
    expect(screen.getByText("rock")).toBeInTheDocument();
    expect(screen.getByText("indie")).toBeInTheDocument();
    expect(screen.getByText("Test Album")).toBeInTheDocument();
    expect(screen.getByText("Test Artist")).toBeInTheDocument();
  });

  it("renders single tag chip", () => {
    render(
      <SuggestionCard releaseGroup={releaseGroup} tags={["rock"]} onClick={vi.fn()} />
    );
    expect(screen.getByText("rock")).toBeInTheDocument();
  });

  it("renders cover image", () => {
    render(
      <SuggestionCard releaseGroup={releaseGroup} tags={["rock"]} onClick={vi.fn()} />
    );
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Test Album cover");
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(
      <SuggestionCard releaseGroup={releaseGroup} tags={["rock"]} onClick={onClick} />
    );
    fireEvent.click(screen.getByText("Test Album"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
