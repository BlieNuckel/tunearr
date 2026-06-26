import { render, screen } from "@testing-library/react";
import StatusBadge from "../StatusBadge";

describe("StatusBadge", () => {
  it("renders the status text", () => {
    render(<StatusBadge status="downloading" />);
    expect(screen.getByText("downloading")).toBeInTheDocument();
  });

  it("sets data-status attribute for known statuses", () => {
    const { rerender } = render(<StatusBadge status="downloading" />);
    expect(screen.getByTestId("status-badge")).toHaveAttribute(
      "data-status",
      "downloading"
    );

    rerender(<StatusBadge status="imported" />);
    expect(screen.getByTestId("status-badge")).toHaveAttribute(
      "data-status",
      "imported"
    );

    rerender(<StatusBadge status="failed" />);
    expect(screen.getByTestId("status-badge")).toHaveAttribute(
      "data-status",
      "failed"
    );
  });

  it("applies a distinct color class for failed rather than the default", () => {
    const { rerender } = render(<StatusBadge status="failed" />);
    const failedClass = screen.getByTestId("status-badge").className;
    expect(failedClass).toContain("bg-rose-400");

    rerender(<StatusBadge status="something-unknown" />);
    expect(screen.getByTestId("status-badge").className).not.toContain(
      "bg-rose-400"
    );
  });

  it("sets data-status for unknown status", () => {
    render(<StatusBadge status="something-unknown" />);
    expect(screen.getByTestId("status-badge")).toHaveAttribute(
      "data-status",
      "something-unknown"
    );
  });
});
