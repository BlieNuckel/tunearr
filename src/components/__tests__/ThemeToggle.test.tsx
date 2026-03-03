import { render, screen, fireEvent } from "@testing-library/react";
import ThemeToggle from "../ThemeToggle";

const mockSetTheme = vi.fn();

vi.mock("@/context/useTheme", () => ({
  useTheme: () => ({ theme: "system", setTheme: mockSetTheme }),
}));

const mockHaptic = vi.fn();
vi.mock("@/hooks/useHaptics", () => ({
  useHaptics: () => ({ haptic: mockHaptic, isSupported: true }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ThemeToggle", () => {
  it("renders current theme label", () => {
    render(<ThemeToggle />);
    expect(screen.getByText("Auto")).toBeInTheDocument();
  });

  it("opens dropdown on click", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: /change theme/i }));
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
  });

  it("sets theme and triggers haptic on option click", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: /change theme/i }));
    fireEvent.click(screen.getByText("Dark"));

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
    expect(mockHaptic).toHaveBeenCalledWith("selection");
  });
});
