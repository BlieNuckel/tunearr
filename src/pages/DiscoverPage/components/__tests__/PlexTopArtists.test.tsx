import { render, screen, fireEvent } from "@testing-library/react";
import PlexTopArtists from "../PlexTopArtists";
import type { TopArtistsRange } from "@/hooks/useDiscover";

type Artist = { name: string; viewCount: number; thumb?: string };

function renderComponent(
  overrides: {
    artists?: Artist[];
    selectedArtist?: string | null;
    onSelect?: () => void;
    range?: TopArtistsRange;
    onRangeChange?: (r: TopArtistsRange) => void;
    refreshing?: boolean;
  } = {}
) {
  return render(
    <PlexTopArtists
      artists={overrides.artists ?? [{ name: "Radiohead", viewCount: 50 }]}
      selectedArtist={overrides.selectedArtist ?? null}
      onSelect={overrides.onSelect ?? vi.fn()}
      range={overrides.range ?? "all"}
      onRangeChange={overrides.onRangeChange ?? vi.fn()}
      refreshing={overrides.refreshing}
    />
  );
}

describe("PlexTopArtists", () => {
  it("shows empty hint when no artists", () => {
    renderComponent({ artists: [] });
    expect(
      screen.getByText("No plays in this period yet.")
    ).toBeInTheDocument();
  });

  it("renders artist buttons", () => {
    renderComponent({
      artists: [
        { name: "Radiohead", viewCount: 100 },
        { name: "Pink Floyd", viewCount: 80 },
      ],
    });

    expect(screen.getByText("Radiohead")).toBeInTheDocument();
    expect(screen.getByText("Pink Floyd")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument();
  });

  it("renders heading", () => {
    renderComponent();
    expect(screen.getByText("Based on your listening")).toBeInTheDocument();
  });

  it("calls onSelect when artist clicked", () => {
    const onSelect = vi.fn();
    renderComponent({ onSelect });

    fireEvent.click(screen.getByText("Radiohead"));
    expect(onSelect).toHaveBeenCalledWith("Radiohead");
  });

  it("highlights selected artist", () => {
    renderComponent({
      artists: [
        { name: "Radiohead", viewCount: 100 },
        { name: "Muse", viewCount: 80 },
      ],
      selectedArtist: "Radiohead",
    });

    const radioheadButton = screen.getByText("Radiohead").closest("button")!;
    expect(radioheadButton.className).toContain("bg-pink-400");
  });

  it("renders artist thumbnail when available", () => {
    renderComponent({
      artists: [{ name: "Radiohead", viewCount: 50, thumb: "/img.jpg" }],
    });

    const img = document.querySelector("img");
    expect(img).toHaveAttribute("src", "/img.jpg");
  });

  it("renders the range options and highlights the active one", () => {
    renderComponent({ range: "6months" });

    const activeButton = screen.getByText("6 months").closest("button")!;
    expect(activeButton.className).toContain("bg-sky-400");
    expect(screen.getByText("All time")).toBeInTheDocument();
    expect(screen.getByText("4 weeks")).toBeInTheDocument();
  });

  it("calls onRangeChange when a range is clicked", () => {
    const onRangeChange = vi.fn();
    renderComponent({ onRangeChange });

    fireEvent.click(screen.getByText("4 weeks"));
    expect(onRangeChange).toHaveBeenCalledWith("4weeks");
  });

  it("dims the chips while refreshing", () => {
    renderComponent({ refreshing: true });
    const chip = screen.getByText("Radiohead").closest("button")!;
    expect(chip.parentElement!.className).toContain("opacity-50");
  });
});
