import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecommendationsSection from "../RecommendationsSection";
import type { PromotedAlbumSettings } from "@/context/lidarrContextDef";

const defaultConfig: PromotedAlbumSettings = {
  cacheDurationMinutes: 30,
  topArtistsCount: 10,
  pickedArtistsCount: 3,
  tagsPerArtist: 5,
  deepPageMin: 2,
  deepPageMax: 10,
  genericTags: ["seen live", "favorites"],
  libraryPreference: "prefer_new",
};

function getInputByLabel(label: string): HTMLInputElement {
  const labelEl = screen.getByText(label);
  const container = labelEl.closest("div")!;
  return within(container).getByRole("spinbutton") as HTMLInputElement;
}

describe("RecommendationsSection", () => {
  it("renders the heading and all controls", () => {
    render(
      <RecommendationsSection
        config={defaultConfig}
        onConfigChange={vi.fn()}
      />
    );

    expect(screen.getByText("Recommendations")).toBeInTheDocument();
    expect(screen.getByText("Cache Duration (minutes)")).toBeInTheDocument();
    expect(screen.getByText("Top Artists Count")).toBeInTheDocument();
    expect(screen.getByText("Picked Artists Count")).toBeInTheDocument();
    expect(screen.getByText("Tags per Artist")).toBeInTheDocument();
    expect(screen.getByText("Deep Page Min")).toBeInTheDocument();
    expect(screen.getByText("Deep Page Max")).toBeInTheDocument();
    expect(screen.getByText("Library Preference")).toBeInTheDocument();
    expect(screen.getByText("Generic Tags (filtered out)")).toBeInTheDocument();
  });

  it("displays current config values in the correct fields", () => {
    render(
      <RecommendationsSection
        config={defaultConfig}
        onConfigChange={vi.fn()}
      />
    );

    expect(getInputByLabel("Cache Duration (minutes)").value).toBe("30");
    expect(getInputByLabel("Top Artists Count").value).toBe("10");
    expect(getInputByLabel("Picked Artists Count").value).toBe("3");
    expect(getInputByLabel("Tags per Artist").value).toBe("5");
    expect(getInputByLabel("Deep Page Min").value).toBe("2");
    expect(getInputByLabel("Deep Page Max").value).toBe("10");
  });

  it("calls onConfigChange when a number field changes", async () => {
    const onConfigChange = vi.fn();
    render(
      <RecommendationsSection
        config={defaultConfig}
        onConfigChange={onConfigChange}
      />
    );

    const topArtistsInput = getInputByLabel("Top Artists Count");
    await userEvent.type(topArtistsInput, "5");

    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ topArtistsCount: 50 })
    );
  });

  it("calls onConfigChange when library preference changes", async () => {
    const onConfigChange = vi.fn();
    render(
      <RecommendationsSection
        config={defaultConfig}
        onConfigChange={onConfigChange}
      />
    );

    await userEvent.click(screen.getByText("Prefer Library"));
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ libraryPreference: "prefer_library" })
    );
  });

  it("highlights the active library preference button", () => {
    render(
      <RecommendationsSection
        config={defaultConfig}
        onConfigChange={vi.fn()}
      />
    );

    const preferNewBtn = screen.getByText("Prefer New");
    expect(preferNewBtn.className).toContain("bg-pink-400");

    const preferLibBtn = screen.getByText("Prefer Library");
    expect(preferLibBtn.className).not.toContain("bg-pink-400");
  });

  it("renders generic tags", () => {
    render(
      <RecommendationsSection
        config={defaultConfig}
        onConfigChange={vi.fn()}
      />
    );

    expect(screen.getByText("seen live")).toBeInTheDocument();
    expect(screen.getByText("favorites")).toBeInTheDocument();
  });

  it("resets to defaults when reset button is clicked", async () => {
    const onConfigChange = vi.fn();
    const customConfig: PromotedAlbumSettings = {
      ...defaultConfig,
      topArtistsCount: 25,
      cacheDurationMinutes: 60,
      libraryPreference: "no_preference",
    };

    render(
      <RecommendationsSection
        config={customConfig}
        onConfigChange={onConfigChange}
      />
    );

    await userEvent.click(screen.getByText("Reset to Defaults"));

    const resetCall = onConfigChange.mock.calls[0][0];
    expect(resetCall.topArtistsCount).toBe(10);
    expect(resetCall.cacheDurationMinutes).toBe(30);
    expect(resetCall.libraryPreference).toBe("prefer_new");
  });

  it("adjusts deepPageMax when deepPageMin exceeds it", async () => {
    const onConfigChange = vi.fn();
    const config = { ...defaultConfig, deepPageMin: 3, deepPageMax: 5 };

    render(
      <RecommendationsSection
        config={config}
        onConfigChange={onConfigChange}
      />
    );

    const minInput = getInputByLabel("Deep Page Min");
    // Typing "5" appends to "3" making "35", clamped to 35 which exceeds deepPageMax=5
    await userEvent.type(minInput, "5");

    const lastCall =
      onConfigChange.mock.calls[onConfigChange.mock.calls.length - 1][0];
    expect(lastCall.deepPageMin).toBe(35);
    expect(lastCall.deepPageMax).toBe(35);
  });
});
