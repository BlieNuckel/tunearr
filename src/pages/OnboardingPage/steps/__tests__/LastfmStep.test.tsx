import { render, screen, fireEvent } from "@testing-library/react";
import LastfmStep from "../LastfmStep";

describe("LastfmStep", () => {
  it("renders description", () => {
    render(<LastfmStep apiKey="" onApiKeyChange={vi.fn()} />);
    expect(
      screen.getByText(/Last.fm powers the Discover page/)
    ).toBeInTheDocument();
  });

  it("renders API key input", () => {
    render(<LastfmStep apiKey="" onApiKeyChange={vi.fn()} />);
    expect(
      screen.getByPlaceholderText("Enter Last.fm API key")
    ).toBeInTheDocument();
  });

  it("calls onApiKeyChange on input change", () => {
    const onApiKeyChange = vi.fn();
    render(<LastfmStep apiKey="" onApiKeyChange={onApiKeyChange} />);
    fireEvent.change(screen.getByPlaceholderText("Enter Last.fm API key"), {
      target: { value: "abc123" },
    });
    expect(onApiKeyChange).toHaveBeenCalledWith("abc123");
  });

  it("shows help text", () => {
    render(<LastfmStep apiKey="" onApiKeyChange={vi.fn()} />);
    expect(
      screen.getByText(/last.fm\/api\/account\/create/)
    ).toBeInTheDocument();
  });
});
