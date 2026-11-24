import { render, screen, fireEvent } from "@testing-library/react";
import PlexSection from "../PlexSection";
import type { UsePlexConnectionResult } from "@/hooks/usePlexConnection";

vi.mock("@/components/PlexAuth", () => ({
  default: () => <div data-testid="plex-auth" />,
}));

const plex: UsePlexConnectionResult = {
  connection: {
    connected: true,
    account: { username: "owner", thumb: "" },
    serverUrl: "http://plex:32400",
    owned: true,
    servers: [],
  },
  loading: false,
  busy: false,
  error: null,
  connect: vi.fn(),
  selectServer: vi.fn(),
  disconnect: vi.fn(),
};

function renderSection(
  captureEnabled: boolean,
  onCaptureEnabledChange = vi.fn(),
  connection: UsePlexConnectionResult["connection"] = plex.connection
) {
  render(
    <PlexSection
      plex={{ ...plex, connection }}
      captureEnabled={captureEnabled}
      onCaptureEnabledChange={onCaptureEnabledChange}
    />
  );
  return onCaptureEnabledChange;
}

describe("PlexSection", () => {
  it("renders the Plex sign-in", () => {
    renderSection(true);
    expect(screen.getByTestId("plex-auth")).toBeInTheDocument();
  });

  it("reflects the listening capture switch", () => {
    renderSection(false);
    expect(
      screen.getByRole("checkbox", { name: "Record listening history" })
    ).not.toBeChecked();
  });

  it("reports a toggle of the listening capture switch", () => {
    const onChange = renderSection(true);
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Record listening history" })
    );
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("turns the switch off and explains why while no server is connected", () => {
    renderSection(true, vi.fn(), null);
    const checkbox = screen.getByRole("checkbox", {
      name: "Record listening history",
    });
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(screen.getByText(/Sign in with Plex above/)).toBeInTheDocument();
  });
});
