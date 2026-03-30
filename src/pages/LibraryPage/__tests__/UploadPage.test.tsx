import { render, screen, waitFor } from "@testing-library/react";
import UploadPage from "../UploadPage";
import { Permission } from "@shared/permissions";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useSearchParams: () => [new URLSearchParams("mbid=test-mbid-123")],
  useNavigate: () => mockNavigate,
  Link: ({
    to,
    children,
    ...props
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, permissions: Permission.ADMIN },
  }),
}));

vi.mock("@/hooks/useFileUpload", () => ({
  default: () => ({
    step: "idle",
    files: [],
    items: [],
    error: null,
    addFiles: vi.fn(),
    removeFile: vi.fn(),
    startUpload: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("@/components/ImageWithShimmer", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        artistName: "Radiohead",
        albumTitle: "OK Computer",
      }),
      { status: 200 }
    )
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UploadPage", () => {
  it("renders back link to library", () => {
    render(<UploadPage />);
    const backLinks = screen.getAllByText("Back to library");
    expect(backLinks.length).toBeGreaterThanOrEqual(1);
    expect(backLinks[0].closest("a")).toHaveAttribute(
      "href",
      "/library/wanted"
    );
  });

  it("fetches and displays release group info", async () => {
    render(<UploadPage />);

    await waitFor(() => {
      expect(screen.getByText("OK Computer")).toBeInTheDocument();
      expect(screen.getByText("Radiohead")).toBeInTheDocument();
    });
  });

  it("shows file upload zone in idle state", () => {
    render(<UploadPage />);
    expect(
      screen.getByText("Drop audio files or a folder here, or click to browse")
    ).toBeInTheDocument();
  });

  it("shows loading state while fetching release group info", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    render(<UploadPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("fetches release group info from correct endpoint", () => {
    render(<UploadPage />);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/musicbrainz/release-group/test-mbid-123"
    );
  });
});
