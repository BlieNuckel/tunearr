import { render, screen, fireEvent } from "@testing-library/react";
import SettingsTabs from "../components/SettingsTabs";

describe("SettingsTabs", () => {
  it("renders all tabs for admins", () => {
    render(<SettingsTabs activeTab="general" onTabChange={vi.fn()} isAdmin={true} />);
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Integrations")).toBeInTheDocument();
    expect(screen.getByText("Recommendations")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
  });

  it("shows only General tab for non-admins", () => {
    render(<SettingsTabs activeTab="general" onTabChange={vi.fn()} isAdmin={false} />);
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.queryByText("Integrations")).not.toBeInTheDocument();
    expect(screen.queryByText("Recommendations")).not.toBeInTheDocument();
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
  });

  it("marks active tab with aria-selected", () => {
    render(<SettingsTabs activeTab="general" onTabChange={vi.fn()} isAdmin={true} />);
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
    render(<SettingsTabs activeTab="general" onTabChange={onTabChange} isAdmin={true} />);
    fireEvent.click(screen.getByText("Integrations"));
    expect(onTabChange).toHaveBeenCalledWith("integrations");
  });

  it("renders tablist role", () => {
    render(<SettingsTabs activeTab="general" onTabChange={vi.fn()} isAdmin={true} />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });
});
