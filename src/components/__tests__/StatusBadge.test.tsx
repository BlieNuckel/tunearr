import { render, screen } from "@testing-library/react";
import StatusBadge from "../StatusBadge";

describe("StatusBadge", () => {
  it("renders the status text", () => {
    render(<StatusBadge status="downloading" />);
    expect(screen.getByText("downloading")).toBeInTheDocument();
  });

  it("applies the correct color class for known statuses", () => {
    const { rerender } = render(<StatusBadge status="downloading" />);
    expect(screen.getByText("downloading")).toHaveClass("bg-sky-300");

    rerender(<StatusBadge status="imported" />);
    expect(screen.getByText("imported")).toHaveClass("bg-emerald-400");

    rerender(<StatusBadge status="failed" />);
    expect(screen.getByText("failed")).toHaveClass("bg-rose-400");
  });

  it("falls back to queued style for unknown status", () => {
    render(<StatusBadge status="something-unknown" />);
    expect(screen.getByText("something-unknown")).toHaveClass("bg-gray-300");
  });
});
