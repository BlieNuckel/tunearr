import { createRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SearchBar from "../SearchBar";

describe("SearchBar", () => {
  it("renders a single search input without a type selector", () => {
    render(<SearchBar onSearch={vi.fn()} />);
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
    expect(screen.queryByText("Album")).not.toBeInTheDocument();
    expect(screen.queryByText("Artist")).not.toBeInTheDocument();
  });

  it("calls onSearch with the query on submit", () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "Radiohead" },
    });
    fireEvent.submit(screen.getByTestId("search-form"));

    expect(onSearch).toHaveBeenCalledWith("Radiohead");
  });

  it("does not call onSearch for whitespace-only query", () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "   " },
    });
    fireEvent.submit(screen.getByTestId("search-form"));

    expect(onSearch).not.toHaveBeenCalled();
  });

  it("syncs input value when initialQuery prop changes", () => {
    const { rerender } = render(
      <SearchBar onSearch={vi.fn()} initialQuery="Radiohead" />
    );
    const input = screen.getByTestId("search-input") as HTMLInputElement;
    expect(input.value).toBe("Radiohead");

    rerender(<SearchBar onSearch={vi.fn()} initialQuery="" />);
    expect(input.value).toBe("");
  });

  it("forwards inputRef to the underlying input element", () => {
    const ref = createRef<HTMLInputElement>();
    render(<SearchBar onSearch={vi.fn()} inputRef={ref} />);
    expect(ref.current).toBe(screen.getByTestId("search-input"));
  });
});
