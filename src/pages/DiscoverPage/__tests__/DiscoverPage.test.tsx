import { render as rtlRender, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DiscoverPage from "../DiscoverPage";

const render = (ui: React.ReactElement) =>
  rtlRender(ui, {
    wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
  });

const mockRefreshPromotedAlbum = vi.fn();
const mockRefreshArtists = vi.fn();

let mockPromotedAlbum: unknown = null;
let mockPromotedArtists: unknown = null;

vi.mock("@/hooks/usePromotedAlbum", () => ({
  default: () => ({
    promotedAlbum: mockPromotedAlbum,
    loading: false,
    error: null,
    refresh: mockRefreshPromotedAlbum,
  }),
}));

vi.mock("@/hooks/usePromotedArtists", () => ({
  default: () => ({
    promotedArtists: mockPromotedArtists,
    loading: false,
    error: null,
    refresh: mockRefreshArtists,
  }),
}));

vi.mock("../components/PromotedAlbum", () => ({
  default: ({
    data,
    onRefresh,
  }: {
    data: { album: { name: string } };
    onRefresh: () => void;
  }) => (
    <div data-testid="promoted-album">
      <span>{data.album.name}</span>
      <button onClick={onRefresh}>Refresh Album</button>
    </div>
  ),
}));

vi.mock("../components/PromotedArtists", () => ({
  default: ({
    data,
    onRefresh,
  }: {
    data: { artists: { name: string }[] };
    onRefresh: () => void;
  }) => (
    <div data-testid="promoted-artists">
      {data.artists.map((a) => (
        <span key={a.name}>{a.name}</span>
      ))}
      <button onClick={onRefresh}>Refresh Artists</button>
    </div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockPromotedAlbum = null;
  mockPromotedArtists = null;
});

describe("DiscoverPage", () => {
  it("renders the Discover heading", () => {
    render(<DiscoverPage />);
    expect(screen.getByText("Discover")).toBeInTheDocument();
  });

  it("renders promoted album when data is available", () => {
    mockPromotedAlbum = { album: { name: "OK Computer" } };
    render(<DiscoverPage />);
    expect(screen.getByTestId("promoted-album")).toBeInTheDocument();
    expect(screen.getByText("OK Computer")).toBeInTheDocument();
  });

  it("does not render promoted album when data is null", () => {
    mockPromotedAlbum = null;
    render(<DiscoverPage />);
    expect(screen.queryByTestId("promoted-album")).not.toBeInTheDocument();
  });

  it("calls refresh when promoted album refresh clicked", () => {
    mockPromotedAlbum = { album: { name: "OK Computer" } };
    render(<DiscoverPage />);
    fireEvent.click(screen.getByText("Refresh Album"));
    expect(mockRefreshPromotedAlbum).toHaveBeenCalled();
  });

  it("renders promoted artists when data is available", () => {
    mockPromotedArtists = {
      artists: [{ name: "Boards of Canada" }],
      seedArtists: ["Aphex Twin"],
    };
    render(<DiscoverPage />);
    expect(screen.getByTestId("promoted-artists")).toBeInTheDocument();
    expect(screen.getByText("Boards of Canada")).toBeInTheDocument();
  });

  it("does not render promoted artists when data is null", () => {
    mockPromotedArtists = null;
    render(<DiscoverPage />);
    expect(screen.queryByTestId("promoted-artists")).not.toBeInTheDocument();
  });

  it("calls refresh when promoted artists refresh clicked", () => {
    mockPromotedArtists = {
      artists: [{ name: "Boards of Canada" }],
      seedArtists: [],
    };
    render(<DiscoverPage />);
    fireEvent.click(screen.getByText("Refresh Artists"));
    expect(mockRefreshArtists).toHaveBeenCalled();
  });
});
