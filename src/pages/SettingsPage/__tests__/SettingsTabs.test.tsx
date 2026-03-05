import { render, screen, fireEvent } from "@testing-library/react";
import SettingsTabs from "../components/SettingsTabs";
import type { SettingsTab } from "../settingsSearchConfig";

const ALL_TABS: SettingsTab[] = [
  "general",
  "integrations",
  "recommendations",
  "admin",
];

describe("SettingsTabs", () => {
  it("renders all visible tabs", () => {
    render(
      <SettingsTabs
        activeTab="general"
        onTabChange={vi.fn()}
        visibleTabs={ALL_TABS}
      />
    );
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Integrations")).toBeInTheDocument();
    expect(screen.getByText("Recommendations")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
  });

  it("only renders tabs in visibleTabs", () => {
    render(
      <SettingsTabs
        activeTab="general"
        onTabChange={vi.fn()}
        visibleTabs={["general"]}
      />
    );
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.queryByText("Integrations")).not.toBeInTheDocument();
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
  });

  it("marks active tab with aria-selected", () => {
    render(
      <SettingsTabs
        activeTab="general"
        onTabChange={vi.fn()}
        visibleTabs={ALL_TABS}
      />
    );
    expect(screen.getByText("General")).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByText("Integrations")).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("calls onTabChange when tab is clicked", () => {
    const onTabChange = vi.fn();
    render(
      <SettingsTabs
        activeTab="general"
        onTabChange={onTabChange}
        visibleTabs={ALL_TABS}
      />
    );
    fireEvent.click(screen.getByText("Integrations"));
    expect(onTabChange).toHaveBeenCalledWith("integrations");
  });

  it("renders tablist role", () => {
    render(
      <SettingsTabs
        activeTab="general"
        onTabChange={vi.fn()}
        visibleTabs={ALL_TABS}
      />
    );
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });
});
