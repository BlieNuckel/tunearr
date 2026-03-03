import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";

const mockUsePlexLogin = vi.fn();
const mockFetchAccount = vi.fn();
const mockPickBestServer = vi.fn();
vi.mock("@/hooks/usePlexLogin", () => ({
  default: (opts: unknown) => mockUsePlexLogin(opts),
  fetchAccount: (...args: unknown[]) => mockFetchAccount(...args),
  pickBestServer: (...args: unknown[]) => mockPickBestServer(...args),
}));

vi.mock("@/utils/plexOAuth", () => ({
  getClientId: () => "test-client-id",
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import PlexAuth from "../PlexAuth";

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchAccount.mockResolvedValue(null);
  mockFetch.mockResolvedValue({ ok: false });
  mockPickBestServer.mockImplementation(
    (servers: { local: boolean }[]) =>
      servers.find((s) => !s.local) ?? servers[0]
  );
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

  it("passes onServers callback that picks best (non-local) server URL", () => {
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    const onServerUrl = vi.fn();
    render(<PlexAuth {...defaultProps} onServerUrl={onServerUrl} />);

    const hookOpts = mockUsePlexLogin.mock.calls[0][0];
    act(() => {
      hookOpts.onServers([
        { name: "My Server", uri: "http://172.23.0.1:32400", local: true },
        {
          name: "My Server",
          uri: "https://remote.example.com:32400",
          local: false,
        },
      ]);
    });
    expect(onServerUrl).toHaveBeenCalledWith(
      "https://remote.example.com:32400"
    );
  });

  it("falls back to first server when all are local", () => {
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    const onServerUrl = vi.fn();
    render(<PlexAuth {...defaultProps} onServerUrl={onServerUrl} />);

    const hookOpts = mockUsePlexLogin.mock.calls[0][0];
    act(() => {
      hookOpts.onServers([
        { name: "My Server", uri: "http://plex:32400", local: true },
      ]);
    });
    expect(onServerUrl).toHaveBeenCalledWith("http://plex:32400");
  });

  it("displays server name in signed-in card after login", async () => {
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    mockFetchAccount.mockResolvedValue({
      username: "testuser",
      thumb: "https://plex.tv/thumb.jpg",
    });

    render(
      <PlexAuth
        {...defaultProps}
        token="my-token"
        serverUrl="http://plex:32400"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("testuser")).toBeInTheDocument();
    });

    const hookOpts = mockUsePlexLogin.mock.calls[0][0];
    act(() => {
      hookOpts.onServers([
        { name: "My Server", uri: "http://plex:32400", local: true },
      ]);
    });
    hookOpts.onAccount({
      username: "testuser",
      thumb: "https://plex.tv/thumb.jpg",
    });
  });

  it("calls custom onSignOut prop when provided instead of default behavior", async () => {
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

  it("shows server picker when signed in with multiple connections", async () => {
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    mockFetchAccount.mockResolvedValue({
      username: "testuser",
      thumb: "https://plex.tv/thumb.jpg",
    });

    render(
      <PlexAuth
        {...defaultProps}
        token="my-token"
        serverUrl="http://172.23.0.1:32400"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("testuser")).toBeInTheDocument();
    });

    const hookOpts = mockUsePlexLogin.mock.calls[0][0];
    act(() => {
      hookOpts.onServers([
        { name: "MyPlex", uri: "http://172.23.0.1:32400", local: true },
        {
          name: "MyPlex",
          uri: "https://remote.example.com:32400",
          local: false,
        },
      ]);
    });

    expect(screen.getByText("Server connection")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("does not show server picker with single connection", async () => {
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
    act(() => {
      hookOpts.onServers([
        { name: "MyPlex", uri: "http://plex:32400", local: true },
      ]);
    });

    expect(screen.queryByText("Server connection")).not.toBeInTheDocument();
  });

  it("calls onServerUrl when user selects a different server", async () => {
    const onServerUrl = vi.fn();
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    mockFetchAccount.mockResolvedValue({
      username: "testuser",
      thumb: "https://plex.tv/thumb.jpg",
    });

    render(
      <PlexAuth
        {...defaultProps}
        token="my-token"
        serverUrl="http://172.23.0.1:32400"
        onServerUrl={onServerUrl}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("testuser")).toBeInTheDocument();
    });

    const hookOpts = mockUsePlexLogin.mock.calls[0][0];
    act(() => {
      hookOpts.onServers([
        { name: "MyPlex", uri: "http://172.23.0.1:32400", local: true },
        {
          name: "MyPlex",
          uri: "https://remote.example.com:32400",
          local: false,
        },
      ]);
    });

    onServerUrl.mockClear();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "https://remote.example.com:32400" },
    });

    expect(onServerUrl).toHaveBeenCalledWith(
      "https://remote.example.com:32400"
    );
  });

  it("passes onLoginComplete to usePlexLogin hook", () => {
    const onLoginComplete = vi.fn();
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });

    render(<PlexAuth {...defaultProps} onLoginComplete={onLoginComplete} />);

    const hookOpts = mockUsePlexLogin.mock.calls[0][0];

    hookOpts.onLoginComplete("test-token", "http://server:32400");

    expect(onLoginComplete).toHaveBeenCalledWith(
      "test-token",
      "http://server:32400"
    );
  });
});
