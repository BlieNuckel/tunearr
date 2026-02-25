import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CompletionScreen from "../components/CompletionScreen";
import type { CollectedAlbum } from "@/hooks/useExploration";

vi.mock("../components/AlbumCard", () => ({
  default: ({ releaseGroup }: { releaseGroup: { title: string } }) => (
    <div data-testid="album-card">{releaseGroup.title}</div>
  ),
}));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeAlbum(id: string, title: string, tag?: string): CollectedAlbum {
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
    tag,
  };
}

const albums = [
  makeAlbum("1", "Source Album"),
  makeAlbum("2", "Pick 1", "rock"),
  makeAlbum("3", "Pick 2", "indie"),
];

function renderCompletion(onReset = vi.fn()) {
  return render(
    <MemoryRouter>
      <CompletionScreen collectedAlbums={albums} onReset={onReset} />
    </MemoryRouter>
  );
}

describe("CompletionScreen", () => {
  it("renders all collected albums", () => {
    renderCompletion();
    const cards = screen.getAllByTestId("album-card");
    expect(cards).toHaveLength(3);
    expect(screen.getByText("Source Album")).toBeInTheDocument();
    expect(screen.getByText("Pick 1")).toBeInTheDocument();
    expect(screen.getByText("Pick 2")).toBeInTheDocument();
  });

  it("shows numbered badges", () => {
    renderCompletion();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows tag chips for tagged albums", () => {
    renderCompletion();
    expect(screen.getByText("rock")).toBeInTheDocument();
    expect(screen.getByText("indie")).toBeInTheDocument();
  });

  it("calls onReset when Start Over is clicked", () => {
    const onReset = vi.fn();
    renderCompletion(onReset);
    fireEvent.click(screen.getByText("Start Over"));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("Add All button makes fetch calls for each album", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), { status: 200 })
    );

    renderCompletion();
    fireEvent.click(screen.getByText("Add All to Library"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  it("shows Added! after successful add all", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), { status: 200 })
    );

    renderCompletion();
    fireEvent.click(screen.getByText("Add All to Library"));

    await waitFor(() => {
      expect(screen.getByText("Added!")).toBeInTheDocument();
    });
  });

  it("displays collection header", () => {
    renderCompletion();
    expect(screen.getByText("Your Collection")).toBeInTheDocument();
    expect(
      screen.getByText("3 albums discovered during your exploration")
    ).toBeInTheDocument();
  });
});
