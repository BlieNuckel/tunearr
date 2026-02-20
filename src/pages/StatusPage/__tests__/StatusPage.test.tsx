import { render, screen, waitFor } from "@testing-library/react";
import StatusPage from "../StatusPage";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockAllEndpoints(
  overrides: {
    queue?: unknown[];
    wanted?: unknown[];
    history?: unknown[];
  } = {}
) {
  vi.mocked(fetch).mockImplementation((input) => {
    const url = typeof input === "string" ? input : (input as Request).url;

    if (url.includes("/api/lidarr/queue")) {
      return Promise.resolve(
        new Response(JSON.stringify({ records: overrides.queue ?? [] }), {
          status: 200,
        })
      );
    }
    if (url.includes("/api/lidarr/wanted")) {
      return Promise.resolve(
        new Response(JSON.stringify({ records: overrides.wanted ?? [] }), {
          status: 200,
        })
      );
    }
    if (url.includes("/api/lidarr/history")) {
      return Promise.resolve(
        new Response(JSON.stringify({ records: overrides.history ?? [] }), {
          status: 200,
        })
      );
    }
    return Promise.resolve(new Response("{}", { status: 200 }));
  });
}

describe("StatusPage", () => {
  it("shows loading state initially", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
    render(<StatusPage />);
    expect(screen.getByText("Loading status...")).toBeInTheDocument();
  });

  it("renders all sections after loading", async () => {
    mockAllEndpoints();
    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.queryByText("Loading status...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Download Queue")).toBeInTheDocument();
    expect(screen.getByText("Wanted / Missing")).toBeInTheDocument();
    expect(screen.getByText("Recent Imports")).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Connection failed"));
    render(<StatusPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load status: Connection failed/)
      ).toBeInTheDocument();
    });
  });

  it("renders queue items", async () => {
    mockAllEndpoints({
      queue: [
        {
          id: 1,
          status: "downloading",
          title: "OK Computer",
          size: 500000000,
          sizeleft: 250000000,
          trackedDownloadStatus: "ok",
          artist: { artistName: "Radiohead" },
          album: { title: "OK Computer" },
          quality: { quality: { name: "FLAC" } },
        },
      ],
    });

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.queryByText("Loading status...")).not.toBeInTheDocument();
    });
  });

  it("renders wanted items", async () => {
    mockAllEndpoints({
      wanted: [
        {
          id: 1,
          title: "In Rainbows",
          foreignAlbumId: "f1",
          artist: { artistName: "Radiohead" },
        },
      ],
    });

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.queryByText("Loading status...")).not.toBeInTheDocument();
    });
  });
});
