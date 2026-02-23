import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
    const { container } = render(<StatusPage />);
    const skeletons = container.querySelectorAll(".animate-shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders all sections after loading", async () => {
    mockAllEndpoints();
    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText("Download Queue")).toBeInTheDocument();
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
      expect(screen.getByText("Download Queue")).toBeInTheDocument();
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
      expect(screen.getByText("Download Queue")).toBeInTheDocument();
    });
  });

  it("calls /api/lidarr/search when Search button is clicked", async () => {
    const wantedItem = {
      id: 42,
      title: "In Rainbows",
      foreignAlbumId: "mbid-f1",
      artist: { artistName: "Radiohead" },
    };

    mockAllEndpoints({ wanted: [wantedItem] });

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText("In Rainbows")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      const searchCall = vi
        .mocked(fetch)
        .mock.calls.find(
          ([input]) =>
            typeof input === "string" && input.includes("/api/lidarr/search")
        );
      expect(searchCall).toBeDefined();
      const options = searchCall![1] as RequestInit;
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body as string)).toEqual({
        albumIds: [42],
      });
    });
  });

  it("refreshes data when Refresh button is clicked", async () => {
    mockAllEndpoints();

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText("Download Queue")).toBeInTheDocument();
    });

    const initialCallCount = vi.mocked(fetch).mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Refresh queue" }));

    await waitFor(() => {
      expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(
        initialCallCount
      );
    });
  });

  it("removes wanted item from list when Unmonitor succeeds", async () => {
    const wantedItem = {
      id: 1,
      title: "In Rainbows",
      foreignAlbumId: "mbid-f1",
      artist: { artistName: "Radiohead" },
    };

    vi.mocked(fetch).mockImplementation((input) => {
      const url = typeof input === "string" ? input : (input as Request).url;

      if (url.includes("/api/lidarr/remove")) {
        return Promise.resolve(
          new Response(JSON.stringify({ status: "success" }), { status: 200 })
        );
      }
      if (url.includes("/api/lidarr/queue")) {
        return Promise.resolve(
          new Response(JSON.stringify({ records: [] }), { status: 200 })
        );
      }
      if (url.includes("/api/lidarr/wanted")) {
        return Promise.resolve(
          new Response(JSON.stringify({ records: [wantedItem] }), {
            status: 200,
          })
        );
      }
      if (url.includes("/api/lidarr/history")) {
        return Promise.resolve(
          new Response(JSON.stringify({ records: [] }), { status: 200 })
        );
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText("In Rainbows")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Unmonitor" }));

    await waitFor(() => {
      expect(screen.queryByText("In Rainbows")).not.toBeInTheDocument();
    });
  });
});
