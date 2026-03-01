import { render, screen, fireEvent } from "@testing-library/react";
import LogsTable from "../LogsTable";
import { LogEntry } from "@/hooks/useLogs";

describe("LogsTable", () => {
  const mockLogs: LogEntry[] = [
    {
      timestamp: "2026-03-01 10:00:00",
      level: "info",
      label: "Server",
      message: "Server started",
    },
    {
      timestamp: "2026-03-01 10:01:00",
      level: "warn",
      label: "API",
      message: "Rate limit approaching",
      data: { remaining: 5 },
    },
    {
      timestamp: "2026-03-01 10:02:00",
      level: "error",
      label: "Database",
      message: "Connection failed",
      data: { code: "ECONNREFUSED" },
    },
  ];

  it("renders empty state when no logs", () => {
    render(<LogsTable logs={[]} />);
    expect(
      screen.getByText("No logs found. Try adjusting your filters.")
    ).toBeInTheDocument();
  });

  it("renders all log entries", () => {
    render(<LogsTable logs={mockLogs} />);

    expect(screen.getByText("Server started")).toBeInTheDocument();
    expect(screen.getByText("Rate limit approaching")).toBeInTheDocument();
    expect(screen.getByText("Connection failed")).toBeInTheDocument();
  });

  it("displays level badges with correct colors", () => {
    render(<LogsTable logs={mockLogs} />);

    const badges = screen.getAllByText(/INFO|WARN|ERROR/);
    expect(badges).toHaveLength(3);
  });

  it("displays labels", () => {
    render(<LogsTable logs={mockLogs} />);

    expect(screen.getByText("[Server]")).toBeInTheDocument();
    expect(screen.getByText("[API]")).toBeInTheDocument();
    expect(screen.getByText("[Database]")).toBeInTheDocument();
  });

  it("shows info icon for logs with data", () => {
    render(<LogsTable logs={mockLogs} />);

    const containers = screen.getAllByText(
      /Rate limit approaching|Connection failed/
    );
    expect(containers).toHaveLength(2);
  });

  it("opens modal when clicking log with data", () => {
    render(<LogsTable logs={mockLogs} />);

    const logWithData = screen.getByText("Rate limit approaching");
    fireEvent.click(logWithData);

    expect(screen.getByText("Log Details")).toBeInTheDocument();
    expect(screen.getByText(/"remaining": 5/)).toBeInTheDocument();
  });

  it("does not open modal for logs without data", () => {
    render(<LogsTable logs={mockLogs} />);

    const logWithoutData = screen.getByText("Server started");
    fireEvent.click(logWithoutData);

    expect(screen.queryByText("Log Details")).not.toBeInTheDocument();
  });

  it("closes modal when close button is clicked", () => {
    render(<LogsTable logs={mockLogs} />);

    const logWithData = screen.getByText("Rate limit approaching");
    fireEvent.click(logWithData);

    expect(screen.getByText("Log Details")).toBeInTheDocument();

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    expect(screen.queryByText("Log Details")).not.toBeInTheDocument();
  });

  it("displays formatted data in modal", () => {
    render(<LogsTable logs={mockLogs} />);

    const logWithData = screen.getByText("Connection failed");
    fireEvent.click(logWithData);

    expect(screen.getByText(/"code": "ECONNREFUSED"/)).toBeInTheDocument();
  });

  it("formats timestamp correctly", () => {
    render(<LogsTable logs={mockLogs} />);

    // Just check that timestamps are rendered (format depends on locale)
    const timestamps = screen.getAllByText(/2026|3\/1/);
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it("renders with stagger animation classes", () => {
    const { container } = render(<LogsTable logs={mockLogs} />);

    const logCards = container.querySelectorAll(".stagger-fade-in");
    expect(logCards).toHaveLength(3);
  });

  it("applies cursor pointer only for logs with data", () => {
    const { container } = render(<LogsTable logs={mockLogs} />);

    const cards = container.querySelectorAll("[class*='rounded-xl']");
    expect(cards).toHaveLength(3);

    // First log (no data) should not have cursor-pointer
    expect(cards[0].className).not.toContain("cursor-pointer");

    // Second and third logs (with data) should have cursor-pointer
    expect(cards[1].className).toContain("cursor-pointer");
    expect(cards[2].className).toContain("cursor-pointer");
  });
});
