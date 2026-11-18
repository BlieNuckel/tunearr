import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SpendingSection from "../SpendingSection";
import type { SpendingSettings } from "@shared/currency";

type FetchCall = [string, RequestInit | undefined];

function mockFetch(
  stored: SpendingSettings,
  patchResponse?: { ok: boolean; body: unknown }
) {
  const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      const response = patchResponse ?? {
        ok: true,
        body: { ...stored, ...JSON.parse(String(init.body)) },
      };
      return Promise.resolve({
        ok: response.ok,
        json: async () => response.body,
      });
    }
    return Promise.resolve({ ok: true, json: async () => stored });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function patchBodies(fetchMock: ReturnType<typeof mockFetch>) {
  return (fetchMock.mock.calls as FetchCall[])
    .filter(([, init]) => init?.method === "PATCH")
    .map(([url, init]) => ({ url, body: JSON.parse(String(init!.body)) }));
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("SpendingSection", () => {
  it("loads the signed-in user's own settings", async () => {
    const fetchMock = mockFetch({ currency: "SEK", monthlyLimit: null });
    render(<SpendingSection />);

    expect(
      await screen.findByDisplayValue("SEK — Swedish Krona")
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/purchases/spending",
      expect.anything()
    );
  });

  it("saves a new currency to the user's settings", async () => {
    const fetchMock = mockFetch({ currency: "USD", monthlyLimit: null });
    render(<SpendingSection />);

    fireEvent.change(await screen.findByDisplayValue("USD — US Dollar"), {
      target: { value: "EUR" },
    });

    expect(await screen.findByDisplayValue("EUR — Euro")).toBeInTheDocument();
    expect(patchBodies(fetchMock)).toEqual([
      { url: "/api/purchases/spending", body: { currency: "EUR" } },
    ]);
  });

  it("renders an empty limit input when there is no limit", async () => {
    mockFetch({ currency: "USD", monthlyLimit: null });
    render(<SpendingSection />);

    expect(await screen.findByPlaceholderText("No limit")).toHaveValue(null);
  });

  it("renders the limit in major units", async () => {
    mockFetch({ currency: "USD", monthlyLimit: 5000 });
    render(<SpendingSection />);

    expect(await screen.findByPlaceholderText("No limit")).toHaveValue(50);
  });

  it("saves the limit in minor units when the field loses focus", async () => {
    const fetchMock = mockFetch({ currency: "USD", monthlyLimit: null });
    render(<SpendingSection />);

    const input = await screen.findByPlaceholderText("No limit");
    fireEvent.change(input, { target: { value: "50" } });
    expect(patchBodies(fetchMock)).toEqual([]);
    fireEvent.blur(input);

    await waitFor(() =>
      expect(patchBodies(fetchMock)).toEqual([
        { url: "/api/purchases/spending", body: { monthlyLimit: 5000 } },
      ])
    );
  });

  it("clears the limit when the field is emptied", async () => {
    const fetchMock = mockFetch({ currency: "USD", monthlyLimit: 5000 });
    render(<SpendingSection />);

    const input = await screen.findByPlaceholderText("No limit");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    await waitFor(() =>
      expect(patchBodies(fetchMock)).toEqual([
        { url: "/api/purchases/spending", body: { monthlyLimit: null } },
      ])
    );
  });

  it("does not save an unchanged or negative limit", async () => {
    const fetchMock = mockFetch({ currency: "USD", monthlyLimit: 5000 });
    render(<SpendingSection />);

    const input = await screen.findByPlaceholderText("No limit");
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: "-5" } });
    fireEvent.blur(input);

    expect(patchBodies(fetchMock)).toEqual([]);
  });

  it("shows the server's error and goes back to the stored value when a save is refused", async () => {
    mockFetch(
      { currency: "USD", monthlyLimit: null },
      {
        ok: false,
        body: { error: "currency must be a 3-letter ISO 4217 code" },
      }
    );
    render(<SpendingSection />);

    fireEvent.change(await screen.findByDisplayValue("USD — US Dollar"), {
      target: { value: "EUR" },
    });

    expect(
      await screen.findByText("currency must be a 3-letter ISO 4217 code")
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("USD — US Dollar")).toBeInTheDocument();
  });

  it("says so when the settings can't be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) })
    );
    render(<SpendingSection />);

    expect(
      await screen.findByText("Could not load your spending settings")
    ).toBeInTheDocument();
  });

  it("warns that changing currency doesn't convert purchases", async () => {
    mockFetch({ currency: "USD", monthlyLimit: null });
    render(<SpendingSection />);

    expect(
      await screen.findByText(/won't convert existing purchase records/)
    ).toBeInTheDocument();
  });

  describe("before the user has chosen a currency", () => {
    it("asks for a currency and holds the limit back", async () => {
      mockFetch({ currency: null, monthlyLimit: null });
      render(<SpendingSection />);

      expect(
        await screen.findByDisplayValue("Choose a currency")
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Choose a currency first")
      ).toBeDisabled();
    });

    it("saves the first currency and then allows a limit", async () => {
      const fetchMock = mockFetch({ currency: null, monthlyLimit: null });
      render(<SpendingSection />);

      fireEvent.change(await screen.findByDisplayValue("Choose a currency"), {
        target: { value: "SEK" },
      });

      expect(
        await screen.findByDisplayValue("SEK — Swedish Krona")
      ).toBeInTheDocument();
      expect(screen.queryByText("Choose a currency")).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("No limit")).toBeEnabled();
      expect(patchBodies(fetchMock)).toEqual([
        { url: "/api/purchases/spending", body: { currency: "SEK" } },
      ]);
    });
  });
});
