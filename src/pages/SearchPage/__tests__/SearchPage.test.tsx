import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SearchPage from "../SearchPage";

vi.mock("@/hooks/useSearch", () => ({
  default: () => ({
    results: [],
    loading: false,
    error: null,
    search: vi.fn(),
  }),
}));

vi.mock("@/hooks/useLibraryAlbums", () => ({
  default: () => ({
    isAlbumInLibrary: () => false,
  }),
}));

function renderSearchPage(query = "") {
  const path = query ? `/search?q=${query}&searchType=album` : "/search";
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SearchPage />
    </MemoryRouter>
  );
}

describe("SearchPage", () => {
  it("renders the heading", () => {
    renderSearchPage();
    expect(screen.getByText("Search Albums")).toBeInTheDocument();
  });

  it("renders the search bar", () => {
    renderSearchPage();
    expect(screen.getByTestId("search-form")).toBeInTheDocument();
  });

  it("shows empty state when no query", () => {
    renderSearchPage();
    expect(screen.getByText("Search for music")).toBeInTheDocument();
  });
});

describe("SearchPage with results", () => {
  it("shows results when available", () => {
    vi.doMock("@/hooks/useSearch", () => ({
      default: () => ({
        results: [
          {
            id: "1",
            title: "OK Computer",
            score: 100,
            "primary-type": "Album",
            "first-release-date": "1997-06-16",
            "artist-credit": [
              { name: "Radiohead", artist: { id: "a1", name: "Radiohead" } },
            ],
          },
        ],
        loading: false,
        error: null,
        search: vi.fn(),
      }),
    }));
  });

  it("shows loading state", () => {
    vi.doMock("@/hooks/useSearch", () => ({
      default: () => ({
        results: [],
        loading: true,
        error: null,
        search: vi.fn(),
      }),
    }));
  });
});
