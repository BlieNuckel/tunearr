import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import BottomSheet from "../BottomSheet";

describe("BottomSheet", () => {
  it("renders nothing when closed", () => {
    render(
      <BottomSheet isOpen={false} onClose={vi.fn()}>
        content
      </BottomSheet>
    );

    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("renders children when open", () => {
    render(
      <BottomSheet isOpen={true} onClose={vi.fn()}>
        <p>sheet content</p>
      </BottomSheet>
    );

    expect(screen.getByText("sheet content")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(
      <BottomSheet isOpen={true} onClose={vi.fn()} title="My Title">
        content
      </BottomSheet>
    );

    expect(screen.getByText("My Title")).toBeInTheDocument();
  });

  it("calls onClose when backdrop area is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <BottomSheet isOpen={true} onClose={onClose}>
        content
      </BottomSheet>
    );

    const backdrop = document.querySelector(".bg-black\\/60")!;
    await user.click(backdrop);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose when sheet content is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <BottomSheet isOpen={true} onClose={onClose}>
        <button>inner button</button>
      </BottomSheet>
    );

    await user.click(screen.getByText("inner button"));

    expect(onClose).not.toHaveBeenCalled();
  });
});
