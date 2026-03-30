import { render, screen, fireEvent } from "@testing-library/react";
import OptionSelect from "../OptionSelect";

vi.mock("../BottomSheet", () => ({
  default: ({
    isOpen,
    children,
    title,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
    title?: string;
  }) =>
    isOpen ? (
      <div data-testid="bottom-sheet">
        {title && <span>{title}</span>}
        {children}
      </div>
    ) : null,
}));

describe("OptionSelect", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it("renders trigger button", () => {
    render(<OptionSelect options={[]} />);

    expect(screen.getByLabelText("More options")).toBeInTheDocument();
  });

  it("shows options when trigger is clicked", () => {
    render(
      <OptionSelect
        options={[
          { label: "Edit", onClick: vi.fn() },
          { label: "Delete", onClick: vi.fn() },
        ]}
      />
    );

    fireEvent.click(screen.getByLabelText("More options"));

    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls option onClick and closes when an option is clicked", () => {
    const handleEdit = vi.fn();
    render(<OptionSelect options={[{ label: "Edit", onClick: handleEdit }]} />);

    fireEvent.click(screen.getByLabelText("More options"));
    fireEvent.click(screen.getByText("Edit"));

    expect(handleEdit).toHaveBeenCalledOnce();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("closes on click outside", () => {
    render(<OptionSelect options={[{ label: "Edit", onClick: vi.fn() }]} />);

    fireEvent.click(screen.getByLabelText("More options"));
    expect(screen.getByText("Edit")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("renders bottom sheet on mobile", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    render(
      <OptionSelect
        title="Options"
        options={[{ label: "Edit", onClick: vi.fn() }]}
      />
    );

    fireEvent.click(screen.getByLabelText("More options"));

    expect(screen.getByTestId("bottom-sheet")).toBeInTheDocument();
    expect(screen.getByText("Options")).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("toggles closed when trigger is clicked again", () => {
    render(<OptionSelect options={[{ label: "Edit", onClick: vi.fn() }]} />);

    const trigger = screen.getByLabelText("More options");
    fireEvent.click(trigger);
    expect(screen.getByText("Edit")).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });
});
