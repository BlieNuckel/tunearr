import { render, screen } from "@testing-library/react";
import SaveStatusIndicator from "../components/SaveStatusIndicator";

describe("SaveStatusIndicator", () => {
  it("renders nothing when idle", () => {
    const { container } = render(
      <SaveStatusIndicator status="idle" error={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows saving spinner", () => {
    render(<SaveStatusIndicator status="saving" error={null} />);
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it("shows saved check mark", () => {
    render(<SaveStatusIndicator status="saved" error={null} />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(<SaveStatusIndicator status="error" error="Network error" />);
    expect(screen.getByText("Save failed: Network error")).toBeInTheDocument();
  });

  it("shows generic error when no message provided", () => {
    render(<SaveStatusIndicator status="error" error={null} />);
    expect(screen.getByText("Save failed")).toBeInTheDocument();
  });
});
