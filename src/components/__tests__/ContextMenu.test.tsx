import { render, screen, fireEvent, act } from "@testing-library/react";
import ContextMenu from "../ContextMenu";

function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

const makeOptions = () => [{ label: "Add to wanted", onClick: vi.fn() }];

beforeEach(() => {
  setMatchMedia(true); // desktop: OptionMenu uses the floating popup
});

describe("ContextMenu — right click", () => {
  it("opens the menu at the pointer on right-click", () => {
    render(
      <ContextMenu options={makeOptions()}>
        <button>Card</button>
      </ContextMenu>
    );

    fireEvent.contextMenu(screen.getByText("Card"));
    expect(screen.getByText("Add to wanted")).toBeInTheDocument();
  });

  it("does not open when disabled", () => {
    render(
      <ContextMenu options={makeOptions()} disabled>
        <button>Card</button>
      </ContextMenu>
    );

    fireEvent.contextMenu(screen.getByText("Card"));
    expect(screen.queryByText("Add to wanted")).not.toBeInTheDocument();
  });

  it("does not open when there are no options", () => {
    render(
      <ContextMenu options={[]}>
        <button>Card</button>
      </ContextMenu>
    );

    fireEvent.contextMenu(screen.getByText("Card"));
    expect(screen.queryByText("Add to wanted")).not.toBeInTheDocument();
  });
});

describe("ContextMenu — long press", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("opens the menu after the long-press delay", () => {
    render(
      <ContextMenu options={makeOptions()} longPressMs={450}>
        <button>Card</button>
      </ContextMenu>
    );
    const card = screen.getByText("Card");

    fireEvent.touchStart(card, { touches: [{ clientX: 5, clientY: 5 }] });
    act(() => vi.advanceTimersByTime(450));

    expect(screen.getByText("Add to wanted")).toBeInTheDocument();
  });

  it("suppresses the click that follows a long press", () => {
    const onClick = vi.fn();
    render(
      <ContextMenu options={makeOptions()} longPressMs={450}>
        <button onClick={onClick}>Card</button>
      </ContextMenu>
    );
    const card = screen.getByText("Card");

    fireEvent.touchStart(card, { touches: [{ clientX: 5, clientY: 5 }] });
    act(() => vi.advanceTimersByTime(450));
    fireEvent.click(card);

    expect(onClick).not.toHaveBeenCalled();
  });

  it("cancels the long press when the finger moves past the threshold", () => {
    render(
      <ContextMenu options={makeOptions()} longPressMs={450}>
        <button>Card</button>
      </ContextMenu>
    );
    const card = screen.getByText("Card");

    fireEvent.touchStart(card, { touches: [{ clientX: 5, clientY: 5 }] });
    fireEvent.touchMove(card, { touches: [{ clientX: 50, clientY: 50 }] });
    act(() => vi.advanceTimersByTime(450));

    expect(screen.queryByText("Add to wanted")).not.toBeInTheDocument();
  });

  it("does not fire when the touch ends before the delay", () => {
    render(
      <ContextMenu options={makeOptions()} longPressMs={450}>
        <button>Card</button>
      </ContextMenu>
    );
    const card = screen.getByText("Card");

    fireEvent.touchStart(card, { touches: [{ clientX: 5, clientY: 5 }] });
    act(() => vi.advanceTimersByTime(200));
    fireEvent.touchEnd(card);
    act(() => vi.advanceTimersByTime(450));

    expect(screen.queryByText("Add to wanted")).not.toBeInTheDocument();
  });
});
