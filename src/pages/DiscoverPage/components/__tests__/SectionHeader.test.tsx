import { render, screen, fireEvent } from "@testing-library/react";
import SectionHeader from "../SectionHeader";
import ShuffleButton from "../ShuffleButton";

describe("SectionHeader", () => {
  it("renders the title as a heading", () => {
    render(<SectionHeader title="New releases" />);
    expect(
      screen.getByRole("heading", { name: "New releases" })
    ).toBeInTheDocument();
  });

  it("renders the action when provided", () => {
    render(
      <SectionHeader title="New releases" action={<button>See all</button>} />
    );
    expect(screen.getByRole("button", { name: "See all" })).toBeInTheDocument();
  });
});

describe("ShuffleButton", () => {
  it("calls onClick when pressed", () => {
    const onClick = vi.fn();
    render(
      <ShuffleButton
        onClick={onClick}
        disabled={false}
        spinning={false}
        ariaLabel="Shuffle things"
      />
    );

    fireEvent.click(screen.getByLabelText("Shuffle things"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled and spins while working", () => {
    render(
      <ShuffleButton
        onClick={vi.fn()}
        disabled
        spinning
        ariaLabel="Shuffle things"
      />
    );

    const button = screen.getByLabelText("Shuffle things");
    expect(button).toBeDisabled();
    expect(button.querySelector("svg")).toHaveClass("animate-spin");
  });
});
