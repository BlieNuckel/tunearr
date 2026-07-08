import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import RefreshButton from "../RefreshButton";

describe("RefreshButton", () => {
  it("renders with default aria-label", () => {
    render(<RefreshButton onRefresh={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  it("renders with custom aria-label", () => {
    render(<RefreshButton onRefresh={vi.fn()} ariaLabel="Refresh requests" />);

    expect(
      screen.getByRole("button", { name: "Refresh requests" })
    ).toBeInTheDocument();
  });

  it("calls onRefresh when clicked", async () => {
    const onRefresh = vi.fn();
    render(<RefreshButton onRefresh={onRefresh} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button"));

    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("is disabled while loading prop is true", () => {
    render(<RefreshButton onRefresh={vi.fn()} loading />);

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is disabled and spinning while an async refresh is pending", async () => {
    let resolveRefresh: () => void = () => {};
    const onRefresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        })
    );
    render(<RefreshButton onRefresh={onRefresh} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button"));

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button.querySelector("svg")).toHaveClass("animate-spin");

    resolveRefresh();

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeEnabled();
    });
    expect(button.querySelector("svg")).not.toHaveClass("animate-spin");
  });
});
