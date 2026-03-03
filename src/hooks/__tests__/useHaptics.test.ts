import { renderHook } from "@testing-library/react";
import { useHaptics } from "../useHaptics";

const mockTrigger = vi.fn();

vi.mock("web-haptics/react", () => ({
  useWebHaptics: () => ({
    trigger: mockTrigger,
    cancel: vi.fn(),
    isSupported: true,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useHaptics", () => {
  it("exposes trigger as haptic", () => {
    const { result } = renderHook(() => useHaptics());
    expect(result.current.haptic).toBe(mockTrigger);
  });

  it("exposes isSupported", () => {
    const { result } = renderHook(() => useHaptics());
    expect(result.current.isSupported).toBe(true);
  });
});
