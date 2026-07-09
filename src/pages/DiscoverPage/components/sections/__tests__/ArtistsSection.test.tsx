import { render, screen } from "@testing-library/react";
import ArtistsSection from "../ArtistsSection";

const mockRefresh = vi.fn();

let mockPromotedArtists: unknown = null;
let mockLoading = false;
let mockError: string | null = null;

vi.mock("@/hooks/usePromotedArtists", () => ({
  default: () => ({
    promotedArtists: mockPromotedArtists,
    loading: mockLoading,
    error: mockError,
    refresh: mockRefresh,
  }),
}));

vi.mock("../../PromotedArtists", () => ({
  default: ({ loading }: { loading: boolean }) => (
    <div data-testid="promoted-artists">{loading ? "loading" : "loaded"}</div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockPromotedArtists = null;
  mockLoading = false;
  mockError = null;
});

describe("ArtistsSection", () => {
  it("renders PromotedArtists while loading", () => {
    mockLoading = true;
    render(<ArtistsSection onStatusChange={vi.fn()} />);
    expect(screen.getByTestId("promoted-artists")).toBeInTheDocument();
  });

  it("renders nothing when loaded without data", () => {
    render(<ArtistsSection onStatusChange={vi.fn()} />);
    expect(screen.queryByTestId("promoted-artists")).not.toBeInTheDocument();
  });

  it("reports ready when artists are available", () => {
    mockPromotedArtists = {
      artists: [{ name: "Boards of Canada" }],
      seedArtists: [],
    };
    const onStatusChange = vi.fn();
    render(<ArtistsSection onStatusChange={onStatusChange} />);
    expect(onStatusChange).toHaveBeenCalledWith("ready");
  });

  it("reports empty when the artist list is empty", () => {
    mockPromotedArtists = { artists: [], seedArtists: [] };
    const onStatusChange = vi.fn();
    render(<ArtistsSection onStatusChange={onStatusChange} />);
    expect(onStatusChange).toHaveBeenCalledWith("empty");
  });

  it("reports error when the hook errors", () => {
    mockError = "boom";
    const onStatusChange = vi.fn();
    render(<ArtistsSection onStatusChange={onStatusChange} />);
    expect(onStatusChange).toHaveBeenCalledWith("error");
  });
});
