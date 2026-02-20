import { render, screen, fireEvent } from "@testing-library/react";
import PlexTopArtists from "../PlexTopArtists";

describe("PlexTopArtists", () => {
  it("returns null when no artists", () => {
    const { container } = render(
      <PlexTopArtists artists={[]} selectedArtist={null} onSelect={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders artist buttons", () => {
    const artists = [
      { name: "Radiohead", viewCount: 100 },
      { name: "Pink Floyd", viewCount: 80 },
    ];

    render(
      <PlexTopArtists
        artists={artists}
        selectedArtist={null}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText("Radiohead")).toBeInTheDocument();
    expect(screen.getByText("Pink Floyd")).toBeInTheDocument();
    expect(screen.getByText("100 plays")).toBeInTheDocument();
    expect(screen.getByText("80 plays")).toBeInTheDocument();
  });

  it("renders heading", () => {
    render(
      <PlexTopArtists
        artists={[{ name: "Radiohead", viewCount: 50 }]}
        selectedArtist={null}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("Based on your listening")).toBeInTheDocument();
  });

  it("calls onSelect when artist clicked", () => {
    const onSelect = vi.fn();
    render(
      <PlexTopArtists
        artists={[{ name: "Radiohead", viewCount: 50 }]}
        selectedArtist={null}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByText("Radiohead"));
    expect(onSelect).toHaveBeenCalledWith("Radiohead");
  });

  it("highlights selected artist", () => {
    render(
      <PlexTopArtists
        artists={[
          { name: "Radiohead", viewCount: 100 },
          { name: "Muse", viewCount: 80 },
        ]}
        selectedArtist="Radiohead"
        onSelect={vi.fn()}
      />
    );

    const radioheadButton = screen.getByText("Radiohead").closest("button")!;
    expect(radioheadButton.className).toContain("bg-pink-400");
  });

  it("renders artist thumbnail when available", () => {
    render(
      <PlexTopArtists
        artists={[{ name: "Radiohead", viewCount: 50, thumb: "/img.jpg" }]}
        selectedArtist={null}
        onSelect={vi.fn()}
      />
    );

    const img = document.querySelector("img");
    expect(img).toHaveAttribute("src", "/img.jpg");
  });
});
