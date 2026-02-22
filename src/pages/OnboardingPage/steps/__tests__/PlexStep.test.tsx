import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/usePlexLogin", () => ({
  default: () => ({ loading: false, login: vi.fn() }),
  fetchAccount: () => Promise.resolve(null),
}));

import PlexStep from "../PlexStep";

const defaultProps = {
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

  it("does not render manual input fields", () => {
    render(<PlexStep {...defaultProps} />);
    expect(
      screen.queryByPlaceholderText("http://localhost:32400"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Enter Plex token"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("or enter manually")).not.toBeInTheDocument();
  });
});
