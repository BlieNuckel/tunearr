import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import RequestFilter from "../RequestFilter";

const emptyValues = { requester: [], status: [] };

describe("RequestFilter", () => {
  it("renders all approval and lifecycle status options", async () => {
    const user = userEvent.setup();
    render(<RequestFilter values={emptyValues} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Status/ }));

    for (const label of [
      "Pending",
      "Approved",
      "Declined",
      "Wanted",
      "Downloading",
      "Imported",
      "Failed",
    ]) {
      expect(screen.getByRole("option", { name: label })).toBeInTheDocument();
    }
  });

  it("invokes onChange with the toggled lifecycle value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RequestFilter values={emptyValues} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Status/ }));
    await user.click(screen.getByRole("option", { name: "Imported" }));

    expect(onChange).toHaveBeenCalledWith("status", ["imported"]);
  });
});
