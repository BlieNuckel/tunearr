import { render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  Routes,
  Route,
  Outlet,
  useLocation,
} from "react-router-dom";
import ConditionalRedirect from "../ConditionalRedirect";

let mockIsMobile = false;

vi.mock("@/hooks/useIsMobile", () => ({
  default: () => mockIsMobile,
}));

function LocationDisplay() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function Layout() {
  return (
    <>
      <LocationDisplay />
      <Outlet />
    </>
  );
}

function renderWithRoutes() {
  return render(
    <MemoryRouter initialEntries={["/settings"]}>
      <Routes>
        <Route path="/settings" element={<Layout />}>
          <Route
            index
            element={<ConditionalRedirect to="/settings/general" />}
          />
          <Route path="general" element={<div>General page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("ConditionalRedirect", () => {
  afterEach(() => {
    mockIsMobile = false;
  });

  it("redirects to target on desktop", () => {
    mockIsMobile = false;
    renderWithRoutes();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/settings/general"
    );
  });

  it("stays at parent route on mobile", () => {
    mockIsMobile = true;
    renderWithRoutes();
    expect(screen.getByTestId("location")).toHaveTextContent("/settings");
  });
});
