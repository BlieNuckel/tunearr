import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PathInput from "../PathInput";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) });
}

function mockEndpoints({
  valid = true,
  error = "",
  suggestions = [],
}: {
  valid?: boolean;
  error?: string;
  suggestions?: string[];
}) {
  mockFetch.mockImplementation((url: string) => {
    if (url.startsWith("/api/settings/browse")) {
      return jsonResponse({ suggestions });
    }
    if (valid) {
      return jsonResponse({ valid: true });
    }
    return jsonResponse({ error }, false);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PathInput", () => {
  it("renders the current value", () => {
    render(<PathInput value="/imports" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("/imports")).toBeInTheDocument();
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<PathInput value="" onChange={onChange} placeholder="/imports" />);
    fireEvent.change(screen.getByPlaceholderText("/imports"), {
      target: { value: "/data" },
    });
    expect(onChange).toHaveBeenCalledWith("/data");
  });

  it("does not validate an empty value", () => {
    render(<PathInput value="" onChange={vi.fn()} />);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows a success message for a valid path", async () => {
    mockEndpoints({ valid: true });
    render(<PathInput value="/imports" onChange={vi.fn()} />);

    expect(screen.getByText("Checking path...")).toBeInTheDocument();
    expect(
      await screen.findByText("Path exists and is writable")
    ).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/settings/validate-path",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ path: "/imports" }),
      })
    );
  });

  it("shows the error message for an invalid path", async () => {
    mockEndpoints({ valid: false, error: 'Path "/bad" does not exist.' });
    render(<PathInput value="/bad" onChange={vi.fn()} />);

    expect(
      await screen.findByText('Path "/bad" does not exist.')
    ).toBeInTheDocument();
  });

  it("shows directory suggestions when focused", async () => {
    mockEndpoints({ suggestions: ["/imports", "/images"] });
    render(<PathInput value="/im" onChange={vi.fn()} />);

    fireEvent.focus(screen.getByDisplayValue("/im"));
    expect(await screen.findByText("/imports")).toBeInTheDocument();
    expect(screen.getByText("/images")).toBeInTheDocument();
  });

  it("selects a suggestion on click", async () => {
    const onChange = vi.fn();
    mockEndpoints({ suggestions: ["/imports"] });
    render(<PathInput value="/im" onChange={onChange} />);

    fireEvent.focus(screen.getByDisplayValue("/im"));
    fireEvent.click(await screen.findByText("/imports"));
    expect(onChange).toHaveBeenCalledWith("/imports");
  });

  it("selects a suggestion with keyboard navigation", async () => {
    const onChange = vi.fn();
    mockEndpoints({ suggestions: ["/images", "/imports"] });
    render(<PathInput value="/im" onChange={onChange} />);

    const input = screen.getByDisplayValue("/im");
    fireEvent.focus(input);
    await screen.findByText("/images");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("/imports");
  });

  it("excludes the current value from suggestions", async () => {
    mockEndpoints({ valid: true, suggestions: ["/imports"] });
    render(<PathInput value="/imports" onChange={vi.fn()} />);

    fireEvent.focus(screen.getByDisplayValue("/imports"));
    await waitFor(() =>
      expect(
        screen.getByText("Path exists and is writable")
      ).toBeInTheDocument()
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
