import { render, screen, fireEvent } from "@testing-library/react";
import PlexSection from "../PlexSection";
import type { UsePlexConnectionResult } from "@/hooks/usePlexConnection";

vi.mock("@/components/PlexAuth", () => ({
  default: () => <div data-testid="plex-auth" />,
}));

const plex: UsePlexConnectionResult = {
  connection: null,
  loading: false,
  busy: false,
  error: null,
  connect: vi.fn(),
  selectServer: vi.fn(),
  disconnect: vi.fn(),
};

function renderSection(
  captureEnabled: boolean,
  onCaptureEnabledChange = vi.fn()
) {
  render(
    <PlexSection
      plex={plex}
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
});
