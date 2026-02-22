import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/hooks/usePlexLogin", () => ({
  default: () => ({ loading: false, login: vi.fn() }),
}));

import PlexStep from "../PlexStep";

const defaultProps = {
  url: "",
  token: "",
  onUrlChange: vi.fn(),
  onTokenChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlexStep", () => {
  it("renders description", () => {
    render(<PlexStep {...defaultProps} />);
    expect(
      screen.getByText(/Connect Plex to show your most-played/),
    ).toBeInTheDocument();
  });

  it("renders Sign in with Plex button", () => {
    render(<PlexStep {...defaultProps} />);
    expect(screen.getByText("Sign in with Plex")).toBeInTheDocument();
  });

  it("renders or-enter-manually divider", () => {
    render(<PlexStep {...defaultProps} />);
    expect(screen.getByText("or enter manually")).toBeInTheDocument();
  });

  it("renders URL and token inputs", () => {
    render(<PlexStep {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("http://localhost:32400"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter Plex token")).toBeInTheDocument();
  });

  it("calls onUrlChange on URL input change", () => {
    render(<PlexStep {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("http://localhost:32400"), {
      target: { value: "http://plex:32400" },
    });
    expect(defaultProps.onUrlChange).toHaveBeenCalledWith("http://plex:32400");
  });

  it("calls onTokenChange on token input change", () => {
    render(<PlexStep {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("Enter Plex token"), {
      target: { value: "abc123" },
    });
    expect(defaultProps.onTokenChange).toHaveBeenCalledWith("abc123");
  });
});
