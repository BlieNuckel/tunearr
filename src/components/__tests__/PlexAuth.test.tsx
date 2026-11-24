import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlexAuth from "../PlexAuth";
import type {
  PlexConnection,
  UsePlexConnectionResult,
} from "@/hooks/usePlexConnection";

const connected: PlexConnection = {
  connected: true,
  account: { username: "owner", thumb: "https://plex.tv/thumb" },
  serverUrl: "https://home.plex.direct:32400",
  owned: true,
  servers: [
    { name: "Home", uri: "https://home.plex.direct:32400", local: false },
    { name: "Home", uri: "http://192.168.1.10:32400", local: true },
  ],
};

function plexWith(
  overrides: Partial<UsePlexConnectionResult> = {}
): UsePlexConnectionResult {
  return {
    connection: null,
    loading: false,
    busy: false,
    error: null,
    connect: vi.fn(),
    selectServer: vi.fn(),
    disconnect: vi.fn(),
    ...overrides,
  };
}

describe("PlexAuth", () => {
  it("offers to sign in when nothing is connected", () => {
    const plex = plexWith();
    render(<PlexAuth plex={plex} />);

    fireEvent.click(screen.getByText("Sign in with Plex"));

    expect(plex.connect).toHaveBeenCalled();
  });

  it("disables the sign-in while a connect is in flight", () => {
    render(<PlexAuth plex={plexWith({ busy: true })} />);
    expect(screen.getByText("Signing in...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows a spinner while the connection loads", () => {
    render(<PlexAuth plex={plexWith({ loading: true })} />);
    expect(screen.getByText("Loading Plex connection...")).toBeInTheDocument();
  });

  it("shows the connected account and its server", () => {
    render(<PlexAuth plex={plexWith({ connection: connected })} />);
    expect(screen.getByText("owner")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("disconnects on sign out", () => {
    const plex = plexWith({ connection: connected });
    render(<PlexAuth plex={plex} />);

    fireEvent.click(screen.getByText("Sign out"));

    expect(plex.disconnect).toHaveBeenCalled();
  });

  it("switches server from the picker", () => {
    const plex = plexWith({ connection: connected });
    render(<PlexAuth plex={plex} />);

    fireEvent.change(screen.getByLabelText("Server connection"), {
      target: { value: "http://192.168.1.10:32400" },
    });

    expect(plex.selectServer).toHaveBeenCalledWith("http://192.168.1.10:32400");
  });

  it("hides the picker when the account reaches one connection", () => {
    render(
      <PlexAuth
        plex={plexWith({
          connection: { ...connected, servers: [connected.servers[0]] },
        })}
      />
    );
    expect(
      screen.queryByLabelText("Server connection")
    ).not.toBeInTheDocument();
  });

  it("warns when the connected account does not own the server", () => {
    render(
      <PlexAuth
        plex={plexWith({ connection: { ...connected, owned: false } })}
      />
    );
    expect(screen.getByText(/doesn't own the server/)).toBeInTheDocument();
  });

  it("does not warn for the owner", () => {
    render(<PlexAuth plex={plexWith({ connection: connected })} />);
    expect(
      screen.queryByText(/doesn't own the server/)
    ).not.toBeInTheDocument();
  });

  it("shows a failed action", () => {
    render(<PlexAuth plex={plexWith({ error: "Failed to connect Plex" })} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Failed to connect Plex"
    );
  });
});
