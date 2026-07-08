import { render, screen, fireEvent } from "@testing-library/react";
import ImportSection from "../ImportSection";

const mockFetch = vi.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ valid: true }) })
);
vi.stubGlobal("fetch", mockFetch);

describe("ImportSection", () => {
  it("renders the current import path", () => {
    render(
      <ImportSection importPath="/imports" onImportPathChange={vi.fn()} />
    );

    expect(screen.getByDisplayValue("/imports")).toBeInTheDocument();
  });

  it("calls onImportPathChange when the path changes", () => {
    const onChange = vi.fn();
    render(<ImportSection importPath="" onImportPathChange={onChange} />);

    const input = screen.getByPlaceholderText("/imports");
    fireEvent.change(input, { target: { value: "/data/imports" } });

    expect(onChange).toHaveBeenCalledWith("/data/imports");
  });
});
