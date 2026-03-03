import { renderHook } from "@testing-library/react";
import { useIsAdmin } from "../useIsAdmin";

const mockUseAuth = vi.fn();

vi.mock("@/context/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("useIsAdmin", () => {
  it("returns true when user is admin", () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: "admin", role: "admin", theme: "system", thumb: null },
    });

    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(true);
  });

  it("returns false when user is regular user", () => {
    mockUseAuth.mockReturnValue({
      user: { id: 2, username: "user", role: "user", theme: "system", thumb: null },
    });

    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);
  });

  it("returns false when user is null", () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);
  });
});
