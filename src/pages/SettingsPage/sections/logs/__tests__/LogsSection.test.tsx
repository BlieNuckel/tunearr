import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LogsSection from "../LogsSection";
import type { LogEntry } from "@/hooks/useLogs";

type Response = {
  logs: LogEntry[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  truncated: boolean;
};

const mockFetch = vi.fn();

const ENTRY: LogEntry = {
  timestamp: "2026-11-22 10:00:00",
  level: "warn",
  label: "LiveEvents",
  message: "Could not resolve artist",
};

function respond(overrides: Partial<Response> = {}) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        logs: [ENTRY],
        page: 1,
        pageSize: 25,
        totalCount: 1,
        totalPages: 1,
        truncated: false,
        ...overrides,
      }),
  });
}

function lastUrl(): string {
  return mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LogsSection", () => {
  it("shows the entries the server returns", async () => {
    respond();

    render(<LogsSection />);

    expect(
      await screen.findByText("Could not resolve artist")
    ).toBeInTheDocument();
    expect(lastUrl()).toBe("/api/logs?page=1&pageSize=25");
  });

  it("says when older entries were left out", async () => {
    respond({ truncated: true });

    render(<LogsSection />);

    expect(
      await screen.findByText(/Older entries are left out/)
    ).toBeInTheDocument();
  });

  it("does not mention left-out entries when everything was read", async () => {
    respond();

    render(<LogsSection />);

    await screen.findByText("Could not resolve artist");
    expect(
      screen.queryByText(/Older entries are left out/)
    ).not.toBeInTheDocument();
  });

  it("sends the search to the server and goes back to the first page", async () => {
    respond({ totalCount: 60, totalPages: 3 });

    render(<LogsSection />);
    fireEvent.click(await screen.findByText("Next"));
    await waitFor(() => expect(lastUrl()).toContain("page=2"));

    fireEvent.change(screen.getByPlaceholderText(/Search logs/), {
      target: { value: "resolve" },
    });
    fireEvent.click(screen.getByText("Search"));

    await waitFor(() =>
      expect(lastUrl()).toBe("/api/logs?page=1&pageSize=25&search=resolve")
    );
  });

  it("shows an error when the logs cannot be loaded", async () => {
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

    render(<LogsSection />);

    expect(await screen.findByText("Failed to fetch logs")).toBeInTheDocument();
  });
});
