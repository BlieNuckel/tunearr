import { renderHook, act, waitFor } from "@testing-library/react";
import useSpendingSettings from "../useSpendingSettings";
import type { SpendingSettings } from "@shared/currency";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

/**
 * A refused save awaits refresh(), which resolves inside an effect, and act()
 * won't flush effects until its callback settles: start it in one act, settle it in the next.
 */
async function saveThatRefreshes(
  save: (patch: Partial<SpendingSettings>) => Promise<string | null>,
  patch: Partial<SpendingSettings>
): Promise<string | null> {
  let pending: Promise<string | null> = Promise.resolve(null);
  await act(async () => {
    pending = save(patch);
    await Promise.resolve();
  });
  let error: string | null = null;
  await act(async () => {
    error = await pending;
  });
  return error;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useSpendingSettings", () => {
  it("loads the user's spending settings", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      json({ currency: "SEK", monthlyLimit: 50000 })
    );

    const { result } = renderHook(() => useSpendingSettings());

    await waitFor(() =>
      expect(result.current.spending).toEqual({
        currency: "SEK",
        monthlyLimit: 50000,
      })
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/purchases/spending",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("does not fetch while disabled", () => {
    const { result } = renderHook(() => useSpendingSettings(false));

    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.spending).toBeNull();
  });

  it("reports a failed load", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({}, 500));

    const { result } = renderHook(() => useSpendingSettings());

    await waitFor(() =>
      expect(result.current.error).toBe("Failed to load spending settings")
    );
  });

  it("saves a change and keeps what the server stored", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ currency: "USD", monthlyLimit: null }))
      .mockResolvedValueOnce(json({ currency: "USD", monthlyLimit: 2500 }));

    const { result } = renderHook(() => useSpendingSettings());
    await waitFor(() => expect(result.current.spending).not.toBeNull());

    let error: string | null = "unset";
    await act(async () => {
      error = await result.current.save({ monthlyLimit: 2500 });
    });

    expect(error).toBeNull();
    expect(result.current.spending).toEqual({
      currency: "USD",
      monthlyLimit: 2500,
    });
    expect(fetch).toHaveBeenLastCalledWith("/api/purchases/spending", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthlyLimit: 2500 }),
    });
  });

  it("returns the server's error and reloads the stored value when refused", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ currency: "USD", monthlyLimit: null }))
      .mockResolvedValueOnce(json({ error: "nope" }, 400))
      .mockResolvedValueOnce(json({ currency: "USD", monthlyLimit: null }));

    const { result } = renderHook(() => useSpendingSettings());
    await waitFor(() => expect(result.current.spending).not.toBeNull());

    const error = await saveThatRefreshes(result.current.save, {
      currency: "EUR",
    });

    expect(error).toBe("nope");
    expect(result.current.spending).toEqual({
      currency: "USD",
      monthlyLimit: null,
    });
  });

  it("returns a generic error when the request itself fails", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ currency: "USD", monthlyLimit: null }))
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockResolvedValueOnce(json({ currency: "USD", monthlyLimit: null }));

    const { result } = renderHook(() => useSpendingSettings());
    await waitFor(() => expect(result.current.spending).not.toBeNull());

    const error = await saveThatRefreshes(result.current.save, {
      currency: "EUR",
    });

    expect(error).toBe("Could not save");
  });
});
