import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SettingsTabs from "../shared/SettingsTabs";
import type { SettingsTab } from "../settingsSearchConfig";

const ALL_TABS: SettingsTab[] = [
  "general",
  "integrations",
  "recommendations",
  "admin",
];

const renderSettingsTabs = (
  activeTab: SettingsTab,
  onTabChange: (tab: SettingsTab) => void,
  visibleTabs: SettingsTab[]
) => {
  return render(
    <MemoryRouter initialEntries={["/settings"]}>
      <SettingsTabs
        activeTab={activeTab}
        onTabChange={onTabChange}
        visibleTabs={visibleTabs}
      />
    </MemoryRouter>
  );
};

describe("SettingsTabs", () => {
  it("renders all visible tabs", () => {
    renderSettingsTabs("general", vi.fn(), ALL_TABS);
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Integrations")).toBeInTheDocument();
    expect(screen.getByText("Recommendations")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
  });

  it("only renders tabs in visibleTabs", () => {
    renderSettingsTabs("general", vi.fn(), ["general"]);
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.queryByText("Integrations")).not.toBeInTheDocument();
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
  });

  it("marks active tab with aria-selected", () => {
    renderSettingsTabs("general", vi.fn(), ALL_TABS);
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
    renderSettingsTabs("general", onTabChange, ALL_TABS);
    fireEvent.click(screen.getByText("Integrations"));
    expect(onTabChange).toHaveBeenCalledWith("integrations");
  });

  it("renders tablist role", () => {
    renderSettingsTabs("general", vi.fn(), ALL_TABS);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });
});
