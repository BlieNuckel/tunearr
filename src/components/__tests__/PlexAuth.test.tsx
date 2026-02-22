import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockUsePlexLogin = vi.fn();
const mockFetchAccount = vi.fn();
vi.mock("@/hooks/usePlexLogin", () => ({
  default: (opts: unknown) => mockUsePlexLogin(opts),
  fetchAccount: (...args: unknown[]) => mockFetchAccount(...args),
}));

import PlexAuth from "../PlexAuth";

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchAccount.mockResolvedValue(null);
});

describe("PlexAuth", () => {
  const defaultProps = {
    token: "",
    onToken: vi.fn(),
    onServerUrl: vi.fn(),
  };

  it("renders sign-in button when no token", () => {
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    render(<PlexAuth {...defaultProps} />);
    expect(screen.getByText("Sign in with Plex")).toBeInTheDocument();
  });

  it("shows loading state during login", () => {
    mockUsePlexLogin.mockReturnValue({ loading: true, login: vi.fn() });
    render(<PlexAuth {...defaultProps} />);
    expect(screen.getByText("Signing in...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls login on click", () => {
    const loginFn = vi.fn();
    mockUsePlexLogin.mockReturnValue({ loading: false, login: loginFn });
    render(<PlexAuth {...defaultProps} />);
    fireEvent.click(screen.getByText("Sign in with Plex"));
    expect(loginFn).toHaveBeenCalled();
  });

  it("shows signed-in card when token exists and account loads", async () => {
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    mockFetchAccount.mockResolvedValue({
      username: "testuser",
      thumb: "https://plex.tv/thumb.jpg",
    });

    render(<PlexAuth {...defaultProps} token="my-token" />);

    await waitFor(() => {
      expect(screen.getByText("testuser")).toBeInTheDocument();
    });
    expect(screen.getByText("Sign out")).toBeInTheDocument();
    expect(screen.getByAltText("testuser")).toHaveAttribute(
      "src",
      "https://plex.tv/thumb.jpg"
    );
  });

  it("shows loading state while fetching account", () => {
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    mockFetchAccount.mockReturnValue(new Promise(() => {}));

    render(<PlexAuth {...defaultProps} token="my-token" />);

    expect(screen.getByText("Loading account...")).toBeInTheDocument();
  });

  it("falls back to sign-in button when account fetch fails", async () => {
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    mockFetchAccount.mockResolvedValue(null);

    render(<PlexAuth {...defaultProps} token="my-token" />);

    await waitFor(() => {
      expect(screen.getByText("Sign in with Plex")).toBeInTheDocument();
    });
  });

  it("calls onToken and onServerUrl with empty strings on sign out", async () => {
    const onToken = vi.fn();
    const onServerUrl = vi.fn();
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    mockFetchAccount.mockResolvedValue({
      username: "testuser",
      thumb: "https://plex.tv/thumb.jpg",
    });

    render(
      <PlexAuth token="my-token" onToken={onToken} onServerUrl={onServerUrl} />
    );

    await waitFor(() => {
      expect(screen.getByText("Sign out")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Sign out"));

    expect(onToken).toHaveBeenCalledWith("");
    expect(onServerUrl).toHaveBeenCalledWith("");
  });

  it("passes onServers callback that sets server URL", () => {
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    const onServerUrl = vi.fn();
    render(<PlexAuth {...defaultProps} onServerUrl={onServerUrl} />);

    const hookOpts = mockUsePlexLogin.mock.calls[0][0];
    hookOpts.onServers([
      { name: "My Server", uri: "http://plex:32400", local: true },
    ]);
    expect(onServerUrl).toHaveBeenCalledWith("http://plex:32400");
  });

  it("displays server name in signed-in card after login", async () => {
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    mockFetchAccount.mockResolvedValue({
      username: "testuser",
      thumb: "https://plex.tv/thumb.jpg",
    });

    render(<PlexAuth {...defaultProps} token="my-token" />);

    await waitFor(() => {
      expect(screen.getByText("testuser")).toBeInTheDocument();
    });

    const hookOpts = mockUsePlexLogin.mock.calls[0][0];
    hookOpts.onServers([
      { name: "My Server", uri: "http://plex:32400", local: true },
    ]);
    hookOpts.onAccount({
      username: "testuser",
      thumb: "https://plex.tv/thumb.jpg",
    });
  });

  it("calls custom onSignOut propr when provided instead of default behavior", async () => {
    const onToken = vi.fn();
    const onServerUrl = vi.fn();
    const onSignOut = vi.fn();

    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    mockFetchAccount.mockResolvedValue({
      username: "testuser",
      thumb: "https://plex.tv/thumb.jpg",
    });

    render(
      <PlexAuth
        token="my-token"
        onToken={onToken}
        onServerUrl={onServerUrl}
        onSignOut={onSignOut}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Sign out")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Sign out"));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(onToken).not.toHaveBeenCalled();
    expect(onServerUrl).not.toHaveBeenCalled();
  });
});
