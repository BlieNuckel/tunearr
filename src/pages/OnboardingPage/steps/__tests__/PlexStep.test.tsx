import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/usePlexConnection", () => ({
  default: () => ({
    connection: null,
    loading: false,
    busy: false,
    error: null,
    connect: vi.fn(),
    selectServer: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

import PlexStep from "../PlexStep";

describe("PlexStep", () => {
  it("renders description", () => {
    render(<PlexStep />);
    expect(
      screen.getByText(/Connect the Plex server Tunearr reads/)
    ).toBeInTheDocument();
  });

  it("renders Sign in with Plex button", () => {
    render(<PlexStep />);
    expect(screen.getByText("Sign in with Plex")).toBeInTheDocument();
  });
});
