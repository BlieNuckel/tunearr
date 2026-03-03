import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "../Pagination";

const mockHaptic = vi.fn();
vi.mock("@/hooks/useHaptics", () => ({
  useHaptics: () => ({ haptic: mockHaptic, isSupported: true }),
}));

describe("Pagination", () => {
  it("returns null when totalPages <= 1", () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders page info", () => {
    render(<Pagination page={2} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();
  });

  it("disables Previous on page 1", () => {
    render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByText("Previous")).toBeDisabled();
    expect(screen.getByText("Next")).toBeEnabled();
  });

  it("disables Next on last page", () => {
    render(<Pagination page={3} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByText("Next")).toBeDisabled();
    expect(screen.getByText("Previous")).toBeEnabled();
  });

  it("calls onPageChange with correct values", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByText("Previous"));
    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(mockHaptic).toHaveBeenCalledWith("light");

    fireEvent.click(screen.getByText("Next"));
    expect(onPageChange).toHaveBeenCalledWith(3);
    expect(mockHaptic).toHaveBeenCalledTimes(2);
  });
});
