import { render, screen, fireEvent } from "@testing-library/react";
import SearchBar from "../SearchBar";

describe("SearchBar", () => {
  it("defaults to album search type", () => {
    render(<SearchBar onSearch={vi.fn()} />);
    expect(screen.getByText("Album")).toBeInTheDocument();
  });

  it("calls onSearch with query and search type on submit", () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "Radiohead" },
    });
    fireEvent.submit(screen.getByTestId("search-form"));

    expect(onSearch).toHaveBeenCalledWith("Radiohead", "album");
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

  it("allows changing search type", () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    fireEvent.click(screen.getByText("Album"));
    fireEvent.click(screen.getByText("Artist"));

    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "Bjork" },
    });
    fireEvent.submit(screen.getByTestId("search-form"));

    expect(onSearch).toHaveBeenCalledWith("Bjork", "artist");
  });
});
