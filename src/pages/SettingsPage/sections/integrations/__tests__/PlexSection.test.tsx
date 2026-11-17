import { render, screen, fireEvent } from "@testing-library/react";
import PlexSection from "../PlexSection";

vi.mock("@/components/PlexAuth", () => ({
  default: () => <div data-testid="plex-auth" />,
}));

function renderSection(
  captureEnabled: boolean,
  onCaptureEnabledChange = vi.fn()
) {
  render(
    <PlexSection
      url="http://plex:32400"
      onUrlChange={vi.fn()}
      onSignOut={vi.fn()}
      onLoginComplete={vi.fn()}
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
