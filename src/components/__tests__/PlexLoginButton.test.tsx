import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUsePlexLogin = vi.fn();
vi.mock("@/hooks/usePlexLogin", () => ({
  default: (opts: unknown) => mockUsePlexLogin(opts),
}));

import PlexLoginButton from "../PlexLoginButton";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlexLoginButton", () => {
  it("renders sign-in button", () => {
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    render(<PlexLoginButton onToken={vi.fn()} />);
    expect(screen.getByText("Sign in with Plex")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockUsePlexLogin.mockReturnValue({ loading: true, login: vi.fn() });
    render(<PlexLoginButton onToken={vi.fn()} />);
    expect(screen.getByText("Signing in…")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls login on click", () => {
    const loginFn = vi.fn();
    mockUsePlexLogin.mockReturnValue({ loading: false, login: loginFn });
    render(<PlexLoginButton onToken={vi.fn()} />);
    fireEvent.click(screen.getByText("Sign in with Plex"));
    expect(loginFn).toHaveBeenCalled();
  });

  it("passes onToken and onServerUrl to the hook", () => {
    const onToken = vi.fn();
    const onServerUrl = vi.fn();
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    render(<PlexLoginButton onToken={onToken} onServerUrl={onServerUrl} />);

    const hookOpts = mockUsePlexLogin.mock.calls[0][0];
    expect(hookOpts.onToken).toBe(onToken);

    hookOpts.onServers([{ name: "S", uri: "http://plex:32400", local: true }]);
    expect(onServerUrl).toHaveBeenCalledWith("http://plex:32400");
  });

  it("does not call onServerUrl when servers list is empty", () => {
    const onServerUrl = vi.fn();
    mockUsePlexLogin.mockReturnValue({ loading: false, login: vi.fn() });
    render(<PlexLoginButton onToken={vi.fn()} onServerUrl={onServerUrl} />);

    const hookOpts = mockUsePlexLogin.mock.calls[0][0];
    hookOpts.onServers([]);
    expect(onServerUrl).not.toHaveBeenCalled();
  });
});
