import { render, screen } from "@testing-library/react";
import NotificationBadge from "../NotificationBadge";

describe("NotificationBadge", () => {
  it("renders nothing when count is 0", () => {
    const { container } = render(<NotificationBadge count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for negative values", () => {
    const { container } = render(<NotificationBadge count={-5} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the count when positive", () => {
    render(<NotificationBadge count={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByLabelText("3 new")).toBeInTheDocument();
  });

  it("renders 99+ when count exceeds 99", () => {
    render(<NotificationBadge count={150} />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });
});
