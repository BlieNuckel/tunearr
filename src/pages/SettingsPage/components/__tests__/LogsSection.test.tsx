import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LogsSection from "../LogsSection";

const mockUseLogs = vi.fn();

vi.mock("@/hooks/useLogs", () => ({
  default: (params: any) => mockUseLogs(params),
}));

vi.mock("../LogsTable", () => ({
  default: ({ logs }: { logs: any[] }) => (
    <div data-testid="logs-table">
      {logs.map((log, i) => (
        <div key={i}>{log.message}</div>
      ))}
    </div>
  ),
}));

vi.mock("@/components/Pagination", () => ({
  default: ({ page, totalPages, onPageChange }: any) => (
    <div data-testid="pagination">
      <button onClick={() => onPageChange(page - 1)}>Previous</button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button onClick={() => onPageChange(page + 1)}>Next</button>
    </div>
  ),
}));

describe("LogsSection", () => {
  const mockLogsData = {
    logs: [
      {
        timestamp: "2026-03-01 10:00:00",
        level: "info",
        label: "Server",
        message: "Server started",
      },
    ],
    page: 1,
    pageSize: 25,
    totalCount: 1,
    totalPages: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders heading and controls", () => {
    mockUseLogs.mockReturnValue({
      data: mockLogsData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<LogsSection />);

    expect(screen.getByText("System Logs")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search logs/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /refresh/i })
    ).toBeInTheDocument();
  });

  it("displays level filter buttons", () => {
    mockUseLogs.mockReturnValue({
      data: mockLogsData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<LogsSection />);

    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Info")).toBeInTheDocument();
    expect(screen.getByText("Warnings")).toBeInTheDocument();
    expect(screen.getByText("Errors")).toBeInTheDocument();
  });

  it("shows loading skeleton when loading", () => {
    mockUseLogs.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<LogsSection />);

    const skeletons = screen
      .getAllByRole("generic")
      .filter((el) => el.className.includes("animate-shimmer"));
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error message when error occurs", () => {
    mockUseLogs.mockReturnValue({
      data: null,
      loading: false,
      error: "Failed to fetch logs",
      refetch: vi.fn(),
    });

    render(<LogsSection />);

    expect(screen.getByText("Failed to fetch logs")).toBeInTheDocument();
  });

  it("renders LogsTable with data", () => {
    mockUseLogs.mockReturnValue({
      data: mockLogsData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<LogsSection />);

    expect(screen.getByTestId("logs-table")).toBeInTheDocument();
    expect(screen.getByText("Server started")).toBeInTheDocument();
  });

  it("calls refetch when refresh button is clicked", async () => {
    const mockRefetch = vi.fn();
    mockUseLogs.mockReturnValue({
      data: mockLogsData,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<LogsSection />);

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    await userEvent.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  it("filters by level when level button is clicked", async () => {
    mockUseLogs.mockReturnValue({
      data: mockLogsData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<LogsSection />);

    const errorButton = screen.getByText("Errors");
    await userEvent.click(errorButton);

    await waitFor(() => {
      expect(mockUseLogs).toHaveBeenCalledWith(
        expect.objectContaining({ level: "error", page: 1 })
      );
    });
  });

  it("resets level filter when All button is clicked", async () => {
    mockUseLogs.mockReturnValue({
      data: mockLogsData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<LogsSection />);

    // First click Error to set a filter
    await userEvent.click(screen.getByText("Errors"));

    await waitFor(() => {
      expect(mockUseLogs).toHaveBeenCalledWith(
        expect.objectContaining({ level: "error" })
      );
    });

    // Then click All to reset
    await userEvent.click(screen.getByText("All"));

    await waitFor(() => {
      expect(mockUseLogs).toHaveBeenCalledWith(
        expect.objectContaining({ level: undefined })
      );
    });
  });

  it("searches logs when search form is submitted", async () => {
    mockUseLogs.mockReturnValue({
      data: mockLogsData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<LogsSection />);

    const searchInput = screen.getByPlaceholderText(/search logs/i);
    const searchButton = screen.getByRole("button", { name: /search/i });

    await userEvent.type(searchInput, "test query");
    await userEvent.click(searchButton);

    await waitFor(() => {
      expect(mockUseLogs).toHaveBeenCalledWith(
        expect.objectContaining({ search: "test query", page: 1 })
      );
    });
  });

  it("renders pagination when multiple pages", () => {
    mockUseLogs.mockReturnValue({
      data: { ...mockLogsData, totalPages: 3 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<LogsSection />);

    expect(screen.getByTestId("pagination")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  });

  it("does not render pagination when only one page", () => {
    mockUseLogs.mockReturnValue({
      data: mockLogsData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<LogsSection />);

    expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
  });

  it("changes page when pagination button is clicked", async () => {
    mockUseLogs.mockReturnValue({
      data: { ...mockLogsData, totalPages: 3 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<LogsSection />);

    const nextButton = screen.getByText("Next");
    await userEvent.click(nextButton);

    await waitFor(() => {
      expect(mockUseLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });
  });

  it("disables refresh button while loading", () => {
    mockUseLogs.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<LogsSection />);

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    expect(refreshButton).toBeDisabled();
  });

  it("resets page to 1 when changing level filter", async () => {
    mockUseLogs.mockReturnValue({
      data: { ...mockLogsData, page: 2, totalPages: 3 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<LogsSection />);

    const errorButton = screen.getByText("Errors");
    await userEvent.click(errorButton);

    await waitFor(() => {
      expect(mockUseLogs).toHaveBeenCalledWith(
        expect.objectContaining({ level: "error", page: 1 })
      );
    });
  });

  it("resets page to 1 when submitting search", async () => {
    mockUseLogs.mockReturnValue({
      data: { ...mockLogsData, page: 2, totalPages: 3 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<LogsSection />);

    const searchInput = screen.getByPlaceholderText(/search logs/i);
    const searchButton = screen.getByRole("button", { name: /search/i });

    await userEvent.type(searchInput, "test");
    await userEvent.click(searchButton);

    await waitFor(() => {
      expect(mockUseLogs).toHaveBeenCalledWith(
        expect.objectContaining({ search: "test", page: 1 })
      );
    });
  });
});
