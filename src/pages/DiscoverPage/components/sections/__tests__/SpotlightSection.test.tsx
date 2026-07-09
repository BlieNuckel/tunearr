import { render, screen } from "@testing-library/react";
import SpotlightSection from "../SpotlightSection";

const mockRefresh = vi.fn();

let mockPromotedAlbum: unknown = null;
let mockLoading = false;
let mockError: string | null = null;

vi.mock("@/hooks/usePromotedAlbum", () => ({
  default: () => ({
    promotedAlbum: mockPromotedAlbum,
    loading: mockLoading,
    error: mockError,
    refresh: mockRefresh,
  }),
}));

vi.mock("../../PromotedAlbum", () => ({
  default: ({ loading }: { loading: boolean }) => (
    <div data-testid="promoted-album">{loading ? "loading" : "loaded"}</div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockPromotedAlbum = null;
  mockLoading = false;
  mockError = null;
});

describe("SpotlightSection", () => {
  it("renders PromotedAlbum while loading", () => {
    mockLoading = true;
    render(<SpotlightSection onStatusChange={vi.fn()} />);
    expect(screen.getByTestId("promoted-album")).toBeInTheDocument();
  });

  it("renders PromotedAlbum when data is available", () => {
    mockPromotedAlbum = { album: { name: "OK Computer" } };
    render(<SpotlightSection onStatusChange={vi.fn()} />);
    expect(screen.getByTestId("promoted-album")).toBeInTheDocument();
  });

  it("renders nothing when loaded without data", () => {
    render(<SpotlightSection onStatusChange={vi.fn()} />);
    expect(screen.queryByTestId("promoted-album")).not.toBeInTheDocument();
  });

  it("reports loading while the hook is loading", () => {
    mockLoading = true;
    const onStatusChange = vi.fn();
    render(<SpotlightSection onStatusChange={onStatusChange} />);
    expect(onStatusChange).toHaveBeenCalledWith("loading");
  });

  it("reports ready when data arrives", () => {
    mockPromotedAlbum = { album: { name: "OK Computer" } };
    const onStatusChange = vi.fn();
    render(<SpotlightSection onStatusChange={onStatusChange} />);
    expect(onStatusChange).toHaveBeenCalledWith("ready");
  });

  it("reports empty when loaded without data", () => {
    const onStatusChange = vi.fn();
    render(<SpotlightSection onStatusChange={onStatusChange} />);
    expect(onStatusChange).toHaveBeenCalledWith("empty");
  });

  it("reports error when the hook errors", () => {
    mockError = "boom";
    const onStatusChange = vi.fn();
    render(<SpotlightSection onStatusChange={onStatusChange} />);
    expect(onStatusChange).toHaveBeenCalledWith("error");
  });
});
