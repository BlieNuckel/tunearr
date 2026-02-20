import { render, screen, fireEvent } from "@testing-library/react";
import ArtistSearchForm from "../ArtistSearchForm";

describe("ArtistSearchForm", () => {
  it("renders input and submit button", () => {
    render(<ArtistSearchForm onSearch={vi.fn()} />);
    expect(
      screen.getByPlaceholderText("Type an artist name...")
    ).toBeInTheDocument();
    expect(screen.getByText("Find Similar")).toBeInTheDocument();
  });

  it("disables button when input is empty", () => {
    render(<ArtistSearchForm onSearch={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /find similar/i })
    ).toBeDisabled();
  });

  it("enables button when input has value", () => {
    render(<ArtistSearchForm onSearch={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Type an artist name..."), {
      target: { value: "Radiohead" },
    });
    expect(
      screen.getByRole("button", { name: /find similar/i })
    ).not.toBeDisabled();
  });

  it("calls onSearch with trimmed value on submit", () => {
    const onSearch = vi.fn();
    render(<ArtistSearchForm onSearch={onSearch} />);

    fireEvent.change(screen.getByPlaceholderText("Type an artist name..."), {
      target: { value: "  Radiohead  " },
    });
    fireEvent.submit(
      screen.getByPlaceholderText("Type an artist name...").closest("form")!
    );

    expect(onSearch).toHaveBeenCalledWith("Radiohead");
  });

  it("does not call onSearch with empty input", () => {
    const onSearch = vi.fn();
    render(<ArtistSearchForm onSearch={onSearch} />);

    fireEvent.change(screen.getByPlaceholderText("Type an artist name..."), {
      target: { value: "   " },
    });
    fireEvent.submit(
      screen.getByPlaceholderText("Type an artist name...").closest("form")!
    );

    expect(onSearch).not.toHaveBeenCalled();
  });
});
