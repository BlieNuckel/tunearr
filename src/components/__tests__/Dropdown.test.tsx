import { render, screen, fireEvent } from "@testing-library/react";
import Dropdown from "../Dropdown";

const options = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
];

describe("Dropdown", () => {
  it("shows placeholder when no value is selected", () => {
    render(
      <Dropdown options={options} value="" onChange={vi.fn()} placeholder="Pick a fruit" />,
    );
    expect(screen.getByText("Pick a fruit")).toBeInTheDocument();
  });

  it("shows selected option label", () => {
    render(<Dropdown options={options} value="banana" onChange={vi.fn()} />);
    expect(screen.getByText("Banana")).toBeInTheDocument();
  });

  it("opens dropdown on click and shows all options", () => {
    render(<Dropdown options={options} value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();
    expect(screen.getByText("Cherry")).toBeInTheDocument();
  });

  it("calls onChange with selected value and closes", () => {
    const onChange = vi.fn();
    render(<Dropdown options={options} value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Cherry"));

    expect(onChange).toHaveBeenCalledWith("cherry");
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
  });

  it("highlights the currently selected option", () => {
    render(<Dropdown options={options} value="banana" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button"));

    const bananas = screen.getAllByText("Banana");
    const optionButton = bananas.find((el) => el.tagName === "BUTTON")!;
    expect(optionButton.className).toContain("bg-amber-300");
    expect(optionButton.className).toContain("font-bold");
  });

  it("closes on click outside", () => {
    render(
      <div>
        <span>Outside</span>
        <Dropdown options={options} value="" onChange={vi.fn()} />
      </div>,
    );

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Apple")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByText("Outside"));
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
  });

  it("toggles open/closed on trigger click", () => {
    render(<Dropdown options={options} value="" onChange={vi.fn()} />);

    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);
    expect(screen.getByText("Apple")).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
  });

  describe("searchable", () => {
    it("renders an input as the trigger", () => {
      render(
        <Dropdown options={options} value="" onChange={vi.fn()} searchable placeholder="Search..." />,
      );
      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("shows selected value in the input when closed", () => {
      render(
        <Dropdown options={options} value="banana" onChange={vi.fn()} searchable />,
      );
      expect(screen.getByDisplayValue("Banana")).toBeInTheDocument();
    });

    it("opens dropdown and clears input on focus", () => {
      render(
        <Dropdown options={options} value="banana" onChange={vi.fn()} searchable />,
      );

      fireEvent.focus(screen.getByDisplayValue("Banana"));

      expect(screen.getByRole("textbox")).toHaveValue("");
      const bananas = screen.getAllByText("Banana");
      const optionButton = bananas.find((el) => el.tagName === "BUTTON")!;
      expect(optionButton).toBeInTheDocument();
    });

    it("filters options by search text", () => {
      render(
        <Dropdown options={options} value="" onChange={vi.fn()} searchable placeholder="Search..." />,
      );

      const input = screen.getByPlaceholderText("Search...");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "ban" } });

      expect(screen.getByText("Banana")).toBeInTheDocument();
      expect(screen.queryByText("Apple")).not.toBeInTheDocument();
      expect(screen.queryByText("Cherry")).not.toBeInTheDocument();
    });

    it("shows no matches message when filter has no results", () => {
      render(
        <Dropdown options={options} value="" onChange={vi.fn()} searchable placeholder="Search..." />,
      );

      const input = screen.getByPlaceholderText("Search...");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "xyz" } });

      expect(screen.getByText("No matches")).toBeInTheDocument();
    });

    it("resets filter and shows selected label after selection", () => {
      const onChange = vi.fn();
      render(
        <Dropdown options={options} value="" onChange={onChange} searchable placeholder="Search..." />,
      );

      const input = screen.getByPlaceholderText("Search...");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "ban" } });
      fireEvent.click(screen.getByText("Banana"));

      expect(onChange).toHaveBeenCalledWith("banana");
      expect(input).toHaveValue("");
    });

    it("filters case-insensitively", () => {
      render(
        <Dropdown options={options} value="" onChange={vi.fn()} searchable placeholder="Search..." />,
      );

      const input = screen.getByPlaceholderText("Search...");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "APPLE" } });

      expect(screen.getByText("Apple")).toBeInTheDocument();
    });

    it("closes on click outside and restores selected label", () => {
      render(
        <div>
          <span>Outside</span>
          <Dropdown options={options} value="cherry" onChange={vi.fn()} searchable />
        </div>,
      );

      const input = screen.getByDisplayValue("Cherry");
      fireEvent.focus(input);
      expect(input).toHaveValue("");

      fireEvent.mouseDown(screen.getByText("Outside"));
      expect(input).toHaveValue("Cherry");
    });
  });
});
