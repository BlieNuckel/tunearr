import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsTabs from "../SettingsTabs";

describe("SettingsTabs", () => {
  it("renders all tabs", () => {
    render(<SettingsTabs activeTab="general" onTabChange={vi.fn()} />);

    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Integrations")).toBeInTheDocument();
    expect(screen.getByText("Recommendations")).toBeInTheDocument();
    expect(screen.getByText("Logs")).toBeInTheDocument();
  });

  it("highlights the active tab", () => {
    render(<SettingsTabs activeTab="integrations" onTabChange={vi.fn()} />);

    const integrationsTab = screen.getByRole("tab", { name: "Integrations" });
    expect(integrationsTab).toHaveAttribute("aria-selected", "true");
    expect(integrationsTab.className).toContain("bg-pink-400");
  });

  it("calls onTabChange when clicking a tab", async () => {
    const onTabChange = vi.fn();
    render(<SettingsTabs activeTab="general" onTabChange={onTabChange} />);

    const logsTab = screen.getByRole("tab", { name: "Logs" });
    await userEvent.click(logsTab);

    expect(onTabChange).toHaveBeenCalledWith("logs");
  });

  it("renders tabs in correct order", () => {
    render(<SettingsTabs activeTab="general" onTabChange={vi.fn()} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveTextContent("General");
    expect(tabs[1]).toHaveTextContent("Integrations");
    expect(tabs[2]).toHaveTextContent("Recommendations");
    expect(tabs[3]).toHaveTextContent("Logs");
  });
});
