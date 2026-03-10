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

const mockUseAuth = vi.fn();
vi.mock("@/context/useAuth", () => ({
  useAuth: () => mockUseAuth(),
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
  mockUseAuth.mockReturnValue({
    user: { hasPlexToken: false },
    status: "authenticated",
  });
});

describe("PlexAuth", () => {
  const defaultProps = {
    onServerUrl: vi.fn(),
  };

  it("renders sign-in button when user has no plex token", () => {
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

  it("shows signed-in card when user has plex token and account loads", async () => {
    mockUseAuth.mockReturnValue({
      user: { hasPlexToken: true },
      status: "authenticated",
    });
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    mockFetchAccount.mockResolvedValue({
      username: "testuser",
      thumb: "https://plex.tv/thumb.jpg",
    });
    mockFetch.mockResolvedValue({ ok: false });

    render(<PlexAuth {...defaultProps} />);

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
    mockUseAuth.mockReturnValue({
      user: { hasPlexToken: true },
      status: "authenticated",
    });
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    mockFetchAccount.mockReturnValue(new Promise(() => {}));
    mockFetch.mockReturnValue(new Promise(() => {}));

    render(<PlexAuth {...defaultProps} />);

    expect(screen.getByText("Loading account...")).toBeInTheDocument();
  });

  it("falls back to sign-in button when account fetch fails", async () => {
    mockUseAuth.mockReturnValue({
      user: { hasPlexToken: true },
      status: "authenticated",
    });
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    mockFetchAccount.mockResolvedValue(null);
    mockFetch.mockResolvedValue({ ok: false });

    render(<PlexAuth {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Sign in with Plex")).toBeInTheDocument();
    });
  });

  it("calls onServerUrl with empty string on sign out (default behavior)", async () => {
    const onServerUrl = vi.fn();
    mockUseAuth.mockReturnValue({
      user: { hasPlexToken: true },
      status: "authenticated",
    });
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    mockFetchAccount.mockResolvedValue({
      username: "testuser",
      thumb: "https://plex.tv/thumb.jpg",
    });
    mockFetch.mockResolvedValue({ ok: false });

    render(<PlexAuth onServerUrl={onServerUrl} />);

    await waitFor(() => {
      expect(screen.getByText("Sign out")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Sign out"));

    expect(onServerUrl).toHaveBeenCalledWith("");
  });

  it("passes onServers callback that picks best (non-local) server URL", () => {
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    const onServerUrl = vi.fn();
    render(<PlexAuth onServerUrl={onServerUrl} />);

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
    render(<PlexAuth onServerUrl={onServerUrl} />);

    const hookOpts = mockUsePlexLogin.mock.calls[0][0];
    act(() => {
      hookOpts.onServers([
        { name: "My Server", uri: "http://plex:32400", local: true },
      ]);
    });
    expect(onServerUrl).toHaveBeenCalledWith("http://plex:32400");
  });

  it("calls custom onSignOut prop when provided instead of default behavior", async () => {
    const onServerUrl = vi.fn();
    const onSignOut = vi.fn();
    mockUseAuth.mockReturnValue({
      user: { hasPlexToken: true },
      status: "authenticated",
    });
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    mockFetchAccount.mockResolvedValue({
      username: "testuser",
      thumb: "https://plex.tv/thumb.jpg",
    });
    mockFetch.mockResolvedValue({ ok: false });

    render(<PlexAuth onServerUrl={onServerUrl} onSignOut={onSignOut} />);

    await waitFor(() => {
      expect(screen.getByText("Sign out")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Sign out"));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(onServerUrl).not.toHaveBeenCalled();
  });

  it("shows server picker when signed in with multiple connections", async () => {
    mockUseAuth.mockReturnValue({
      user: { hasPlexToken: true },
      status: "authenticated",
    });
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    mockFetchAccount.mockResolvedValue({
      username: "testuser",
      thumb: "https://plex.tv/thumb.jpg",
    });
    mockFetch.mockResolvedValue({ ok: false });

    render(<PlexAuth {...defaultProps} serverUrl="http://172.23.0.1:32400" />);

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
    mockUseAuth.mockReturnValue({
      user: { hasPlexToken: true },
      status: "authenticated",
    });
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    mockFetchAccount.mockResolvedValue({
      username: "testuser",
      thumb: "https://plex.tv/thumb.jpg",
    });
    mockFetch.mockResolvedValue({ ok: false });

    render(<PlexAuth {...defaultProps} />);

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
    mockUseAuth.mockReturnValue({
      user: { hasPlexToken: true },
      status: "authenticated",
    });
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    mockFetchAccount.mockResolvedValue({
      username: "testuser",
      thumb: "https://plex.tv/thumb.jpg",
    });
    mockFetch.mockResolvedValue({ ok: false });

    render(
      <PlexAuth serverUrl="http://172.23.0.1:32400" onServerUrl={onServerUrl} />
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
});
