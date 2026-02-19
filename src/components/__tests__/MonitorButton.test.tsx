import { render, screen, fireEvent } from "@testing-library/react";
import MonitorButton from "../MonitorButton";
import type { MonitorState } from "../../types";

describe("MonitorButton", () => {
  const onClick = vi.fn();

  afterEach(() => onClick.mockClear());

  it.each([
    ["idle", "Add to Lidarr"],
    ["adding", "Adding..."],
    ["success", "Added"],
    ["already_monitored", "Already Monitored"],
    ["error", "Error"],
  ] as [MonitorState, string][])(
    "shows '%s' label for %s state",
    (state, label) => {
      render(<MonitorButton state={state} onClick={onClick} />);
      expect(screen.getByRole("button")).toHaveTextContent(label);
    }
  );

  it("is disabled for adding, success, and already_monitored", () => {
    const { rerender } = render(
      <MonitorButton state="adding" onClick={onClick} />
    );
    expect(screen.getByRole("button")).toBeDisabled();

    rerender(<MonitorButton state="success" onClick={onClick} />);
    expect(screen.getByRole("button")).toBeDisabled();

    rerender(<MonitorButton state="already_monitored" onClick={onClick} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is enabled for idle and error", () => {
    const { rerender } = render(
      <MonitorButton state="idle" onClick={onClick} />
    );
    expect(screen.getByRole("button")).toBeEnabled();

    rerender(<MonitorButton state="error" onClick={onClick} />);
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it("calls onClick when clicked", () => {
    render(<MonitorButton state="idle" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("shows error message only in error state", () => {
    const { rerender } = render(
      <MonitorButton
        state="error"
        onClick={onClick}
        errorMsg="Something broke"
      />
    );
    expect(screen.getByText("Something broke")).toBeInTheDocument();

    rerender(
      <MonitorButton
        state="idle"
        onClick={onClick}
        errorMsg="Something broke"
      />
    );
    expect(screen.queryByText("Something broke")).not.toBeInTheDocument();
  });
});
