import { renderHook, act, waitFor } from "@testing-library/react";
import useSettings from "../useSettings";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useSettings", () => {
  it("has correct initial loading state", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useSettings());

    expect(result.current.loading).toBe(true);
    expect(result.current.saving).toBe(false);
    expect(result.current.testing).toBe(false);
    expect(result.current.testResult).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("loads settings on mount", async () => {
    const settings = { lidarrUrl: "http://lidarr:8686", lidarrApiKey: "key1" };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(settings), { status: 200 })
    );

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.settings).toEqual(settings);
  });

  it("sets error on load failure", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network failure"));

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe("Network failure");
  });

  it("saves settings successfully", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ lidarrUrl: "", lidarrApiKey: "" }), {
        status: 200,
      })
    );

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const newSettings = {
      lidarrUrl: "http://new:8686",
      lidarrApiKey: "newkey",
    };
    await act(() => result.current.save(newSettings));

    expect(result.current.settings).toEqual(newSettings);
    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets error on save failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ lidarrUrl: "", lidarrApiKey: "" }), {
        status: 200,
      })
    );

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Validation failed" }), {
        status: 400,
      })
    );

    await act(() => result.current.save({ lidarrUrl: "", lidarrApiKey: "" }));

    expect(result.current.error).toBe("Validation failed");
  });

  it("tests connection successfully", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ lidarrUrl: "", lidarrApiKey: "" }), {
        status: 200,
      })
    );

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ version: "2.0.0" }), { status: 200 })
    );

    await act(() =>
      result.current.testConnection({
        lidarrUrl: "http://lidarr:8686",
        lidarrApiKey: "key",
      })
    );

    expect(result.current.testResult).toEqual({
      success: true,
      version: "2.0.0",
    });
    expect(result.current.testing).toBe(false);
  });

  it("tests connection with failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ lidarrUrl: "", lidarrApiKey: "" }), {
        status: 200,
      })
    );

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Connection refused" }), {
        status: 500,
      })
    );

    await act(() =>
      result.current.testConnection({
        lidarrUrl: "http://bad:8686",
        lidarrApiKey: "key",
      })
    );

    expect(result.current.testResult).toEqual({
      success: false,
      error: "Connection refused",
    });
  });
});
