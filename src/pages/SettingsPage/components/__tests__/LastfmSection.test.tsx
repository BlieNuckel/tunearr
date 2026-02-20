import { render, screen, fireEvent } from "@testing-library/react";
import LastfmSection from "../LastfmSection";

describe("LastfmSection", () => {
  it("renders heading", () => {
    render(<LastfmSection apiKey="" onApiKeyChange={vi.fn()} />);
    expect(screen.getByText("Last.fm")).toBeInTheDocument();
  });

  it("renders input with value", () => {
    render(<LastfmSection apiKey="abc123" onApiKeyChange={vi.fn()} />);
    expect(screen.getByDisplayValue("abc123")).toBeInTheDocument();
  });

  it("calls onApiKeyChange on input change", () => {
    const onChange = vi.fn();
    render(<LastfmSection apiKey="" onApiKeyChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText("Enter Last.fm API key"), {
      target: { value: "newkey" },
    });
    expect(onChange).toHaveBeenCalledWith("newkey");
  });

  it("renders help text", () => {
    render(<LastfmSection apiKey="" onApiKeyChange={vi.fn()} />);
    expect(
      screen.getByText(/last.fm\/api\/account\/create/)
    ).toBeInTheDocument();
  });
});
