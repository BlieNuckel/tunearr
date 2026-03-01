import { renderHook, waitFor } from "@testing-library/react";
import useLogs from "../useLogs";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useLogs", () => {
  const mockLogsResponse = {
    logs: [
      {
        timestamp: "2026-03-01 10:00:00",
        level: "info" as const,
        label: "Server",
        message: "Server started",
      },
    ],
    page: 1,
    pageSize: 25,
    totalCount: 1,
    totalPages: 1,
  };

  it("fetches logs on mount", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockLogsResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => useLogs({ page: 1, pageSize: 25 }));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockLogsResponse);
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith("/api/logs?page=1&pageSize=25");
  });

  it("includes level filter in query", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockLogsResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    renderHook(() => useLogs({ page: 1, pageSize: 25, level: "error" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/logs?page=1&pageSize=25&level=error"
      );
    });
  });

  it("includes search filter in query", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockLogsResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    renderHook(() => useLogs({ page: 1, pageSize: 25, search: "test" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/logs?page=1&pageSize=25&search=test"
      );
    });
  });

  it("includes both level and search filters", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockLogsResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    renderHook(() =>
      useLogs({ page: 1, pageSize: 25, level: "warn", search: "test" })
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/logs?page=1&pageSize=25&level=warn&search=test"
      );
    });
  });

  it("sets error on failed fetch", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Server error" }), { status: 500 })
    );

    const { result } = renderHook(() => useLogs({ page: 1, pageSize: 25 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("Failed to fetch logs");
  });

  it("handles network error", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network failure"));

    const { result } = renderHook(() => useLogs({ page: 1, pageSize: 25 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Network failure");
    expect(result.current.data).toBeNull();
  });

  it("refetches logs when refetch is called", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(mockLogsResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => useLogs({ page: 1, pageSize: 25 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    await result.current.refetch();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it("refetches when params change", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(mockLogsResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { rerender } = renderHook(
      ({ page, pageSize }) => useLogs({ page, pageSize }),
      {
        initialProps: { page: 1, pageSize: 25 },
      }
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/logs?page=1&pageSize=25");
    });

    rerender({ page: 2, pageSize: 25 });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/logs?page=2&pageSize=25");
    });
  });
});
