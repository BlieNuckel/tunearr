import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/usePlexLogin", () => ({
  default: () => ({ loading: false, login: vi.fn() }),
  fetchAccount: () => Promise.resolve(null),
}));

import PlexSection from "../PlexSection";

const defaultProps = {
  token: "",
  onUrlChange: vi.fn(),
  onTokenChange: vi.fn(),
  onSignOut: vi.fn(),
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

  it("renders help text", () => {
    render(<PlexSection {...defaultProps} />);
    expect(
      screen.getByText(/Used to show your most-played artists/)
    ).toBeInTheDocument();
  });

  it("does not render manual input fields", () => {
    render(<PlexSection {...defaultProps} />);
    expect(
      screen.queryByPlaceholderText("http://localhost:32400")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Enter Plex token")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("or enter manually")).not.toBeInTheDocument();
  });
});
