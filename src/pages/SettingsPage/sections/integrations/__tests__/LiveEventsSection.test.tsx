import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import LiveEventsSection from "../LiveEventsSection";
import { DEFAULT_LIVE_EVENTS } from "@shared/settingsDefaults";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) })
  );
});

function renderSection(overrides = {}) {
  const onChange = vi.fn();
  render(
    <LiveEventsSection
      settings={{ ...DEFAULT_LIVE_EVENTS, ...overrides }}
      onChange={onChange}
    />
  );
  return onChange;
}

describe("LiveEventsSection", () => {
  it("warns that overage is billed rather than refused", () => {
    renderSection();
    expect(screen.getByText(/billed rather than refused/)).toBeInTheDocument();
  });

  it("leaves paid usage off by default", () => {
    renderSection();
    expect(
      screen.getByRole("checkbox", {
        name: "Allow paid usage past the plan quota",
      })
    ).not.toBeChecked();
  });

  it("turns paid usage on", async () => {
    const onChange = renderSection();

    await userEvent.click(
      screen.getByRole("checkbox", {
        name: "Allow paid usage past the plan quota",
      })
    );

    expect(onChange).toHaveBeenCalledWith({ allowOverage: true });
  });

  it("shows paid usage as on when it is", () => {
    renderSection({ allowOverage: true });
    expect(
      screen.getByRole("checkbox", {
        name: "Allow paid usage past the plan quota",
      })
    ).toBeChecked();
  });

  it("keeps the API key masked", () => {
    renderSection({ apiKey: "jbd_secret" });
    expect(screen.getByDisplayValue("jbd_secret")).toHaveAttribute(
      "type",
      "password"
    );
  });

  it("leaves location, radius, countries and windows to each user, so none are here", () => {
    renderSection();

    for (const label of [
      /latitude/i,
      /radius/i,
      /countries/i,
      /announce/i,
      /reminder/i,
    ]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it("toggles the feature", async () => {
    const onChange = renderSection();
    await userEvent.click(
      screen.getByRole("checkbox", {
        name: "Fetch tour dates for followed artists",
      })
    );
    expect(onChange).toHaveBeenCalledWith({ enabled: true });
  });
});
