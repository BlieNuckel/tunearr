import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SettingsTabs from "../SettingsTabs";
import type { SettingsRoute } from "../SettingsTabs";
import { Permission } from "@shared/permissions";

let mockIsMobile = false;

vi.mock("@/hooks/useIsMobile", () => ({
  default: () => mockIsMobile,
}));

vi.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, permissions: Permission.ADMIN },
  }),
}));

const testRoutes: SettingsRoute[] = [
  {
    text: "General",
    route: "/settings/general",
    regex: /^\/settings\/general/,
  },
  { text: "Users", route: "/settings/users", regex: /^\/settings\/users/ },
  {
    text: "Secret",
    route: "/settings/secret",
    regex: /^\/settings\/secret/,
    hidden: true,
  },
];

function renderTabs(path: string, parentRoute?: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SettingsTabs settingsRoutes={testRoutes} parentRoute={parentRoute}>
        <div data-testid="tab-content">Content here</div>
      </SettingsTabs>
    </MemoryRouter>
  );
}

describe("SettingsTabs", () => {
  afterEach(() => {
    mockIsMobile = false;
  });

  describe("desktop", () => {
    it("renders desktop tab nav", () => {
      renderTabs("/settings/general", "/settings");
      expect(screen.getByTestId("settings-nav-desktop")).toBeInTheDocument();
    });

    it("hides hidden routes", () => {
      renderTabs("/settings/general", "/settings");
      const nav = screen.getByTestId("settings-nav-desktop");
      expect(within(nav).queryByText("Secret")).not.toBeInTheDocument();
    });

    it("marks active tab with aria-current", () => {
      renderTabs("/settings/general", "/settings");
      const nav = screen.getByTestId("settings-nav-desktop");
      expect(within(nav).getByText("General").closest("a")).toHaveAttribute(
        "aria-current",
        "page"
      );
      expect(within(nav).getByText("Users").closest("a")).not.toHaveAttribute(
        "aria-current"
      );
    });

    it("renders children", () => {
      renderTabs("/settings/general", "/settings");
      expect(screen.getByTestId("tab-content")).toBeInTheDocument();
    });

    it("does not render mobile drill-down nav", () => {
      renderTabs("/settings/general", "/settings");
      expect(screen.queryByTestId("mobile-drill-down")).not.toBeInTheDocument();
    });
  });

  describe("mobile with parentRoute (drill-down mode)", () => {
    beforeEach(() => {
      mockIsMobile = true;
    });

    it("shows navigation list at parent route", () => {
      renderTabs("/settings", "/settings");
      const mobileNav = screen.getByTestId("mobile-drill-down");
      expect(within(mobileNav).getByText("General")).toBeInTheDocument();
      expect(within(mobileNav).getByText("Users")).toBeInTheDocument();
    });

    it("hides children at parent route", () => {
      renderTabs("/settings", "/settings");
      expect(screen.queryByTestId("tab-content")).not.toBeInTheDocument();
    });

    it("hides hidden routes in navigation list", () => {
      renderTabs("/settings", "/settings");
      const mobileNav = screen.getByTestId("mobile-drill-down");
      expect(within(mobileNav).queryByText("Secret")).not.toBeInTheDocument();
    });

    it("shows back button at child route", () => {
      renderTabs("/settings/general", "/settings");
      const mobileNav = screen.getByTestId("mobile-drill-down");
      const backLink = within(mobileNav).getByRole("link");
      expect(backLink).toHaveAttribute("href", "/settings");
      expect(backLink).toHaveTextContent("General");
    });

    it("shows children at child route", () => {
      renderTabs("/settings/general", "/settings");
      expect(screen.getByTestId("tab-content")).toBeInTheDocument();
    });

    it("navigation list items link to correct routes", () => {
      renderTabs("/settings", "/settings");
      const mobileNav = screen.getByTestId("mobile-drill-down");
      expect(
        within(mobileNav).getByText("General").closest("a")
      ).toHaveAttribute("href", "/settings/general");
      expect(within(mobileNav).getByText("Users").closest("a")).toHaveAttribute(
        "href",
        "/settings/users"
      );
    });
  });

  describe("mobile without parentRoute (fallback select)", () => {
    beforeEach(() => {
      mockIsMobile = true;
    });

    it("renders select dropdown when no parentRoute", () => {
      renderTabs("/settings/general");
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("shows children with fallback select", () => {
      renderTabs("/settings/general");
      expect(screen.getByTestId("tab-content")).toBeInTheDocument();
    });
  });

  describe("button tab type", () => {
    it("renders button-style tabs on desktop", () => {
      render(
        <MemoryRouter initialEntries={["/settings/general"]}>
          <SettingsTabs
            tabType="button"
            settingsRoutes={testRoutes}
            parentRoute="/settings"
          >
            <div data-testid="tab-content">Content</div>
          </SettingsTabs>
        </MemoryRouter>
      );
      expect(
        screen.getByRole("navigation", { name: "Tabs" })
      ).toBeInTheDocument();
    });
  });
});
