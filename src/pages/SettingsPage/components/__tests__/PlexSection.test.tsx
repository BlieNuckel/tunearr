import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/hooks/usePlexLogin", () => ({
  default: () => ({ loading: false, login: vi.fn() }),
}));

import PlexSection from "../PlexSection";

const defaultProps = {
  url: "",
  token: "",
  onUrlChange: vi.fn(),
  onTokenChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlexSection", () => {
  it("renders heading", () => {
    render(<PlexSection {...defaultProps} />);
    expect(screen.getByText("Plex")).toBeInTheDocument();
  });

  it("renders Sign in with Plex button", () => {
    render(<PlexSection {...defaultProps} />);
    expect(screen.getByText("Sign in with Plex")).toBeInTheDocument();
  });

  it("renders or-enter-manually divider", () => {
    render(<PlexSection {...defaultProps} />);
    expect(screen.getByText("or enter manually")).toBeInTheDocument();
  });

  it("renders URL and token inputs", () => {
    render(<PlexSection {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("http://localhost:32400"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter Plex token")).toBeInTheDocument();
  });

  it("calls onUrlChange on URL input change", () => {
    render(<PlexSection {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("http://localhost:32400"), {
      target: { value: "http://plex:32400" },
    });
    expect(defaultProps.onUrlChange).toHaveBeenCalledWith("http://plex:32400");
  });

  it("calls onTokenChange on token input change", () => {
    render(<PlexSection {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("Enter Plex token"), {
      target: { value: "token123" },
    });
    expect(defaultProps.onTokenChange).toHaveBeenCalledWith("token123");
  });

  it("renders help text", () => {
    render(<PlexSection {...defaultProps} />);
    expect(
      screen.getByText(/Used to show your most-played artists/),
    ).toBeInTheDocument();
  });
});
