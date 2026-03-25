import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import FilterBar from "../FilterBar";

const FILTERS = [
  {
    key: "color",
    label: "Color",
    options: [
      { value: "red", label: "Red" },
      { value: "blue", label: "Blue" },
      { value: "green", label: "Green" },
    ],
  },
  {
    key: "size",
    label: "Size",
    options: [
      { value: "small", label: "Small" },
      { value: "large", label: "Large" },
    ],
  },
];

function renderFilterBar(
  values: Record<string, string[]> = { color: [], size: [] },
  onChange = vi.fn()
) {
  return {
    ...render(
      <FilterBar filters={FILTERS} values={values} onChange={onChange} />
    ),
    onChange,
  };
}

describe("FilterBar — desktop dropdown", () => {
  it("renders a button for each filter group", () => {
    renderFilterBar();

    const colorButtons = screen.getAllByRole("button", { name: /Color/ });
    const sizeButtons = screen.getAllByRole("button", { name: /Size/ });
    expect(colorButtons.length).toBeGreaterThan(0);
    expect(sizeButtons.length).toBeGreaterThan(0);
  });

  it("opens a dropdown with options when a filter button is clicked", async () => {
    const user = userEvent.setup();
    renderFilterBar();

    const colorButtons = screen.getAllByRole("button", { name: /Color/ });
    await user.click(colorButtons[colorButtons.length - 1]);

    expect(screen.getByRole("option", { name: /Red/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Blue/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Green/ })).toBeInTheDocument();
  });

  it("calls onChange with toggled value when an option is clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilterBar();

    const colorButtons = screen.getAllByRole("button", { name: /Color/ });
    await user.click(colorButtons[colorButtons.length - 1]);
    await user.click(screen.getByRole("option", { name: /Red/ }));

    expect(onChange).toHaveBeenCalledWith("color", ["red"]);
  });

  it("removes a value when an already-selected option is clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilterBar({ color: ["red"], size: [] });

    const colorButtons = screen.getAllByRole("button", { name: /Color/ });
    await user.click(colorButtons[colorButtons.length - 1]);
    await user.click(screen.getByRole("option", { name: /Red/ }));

    expect(onChange).toHaveBeenCalledWith("color", []);
  });

  it("supports multi-select", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilterBar({ color: ["red"], size: [] });

    const colorButtons = screen.getAllByRole("button", { name: /Color/ });
    await user.click(colorButtons[colorButtons.length - 1]);
    await user.click(screen.getByRole("option", { name: /Blue/ }));

    expect(onChange).toHaveBeenCalledWith("color", ["red", "blue"]);
  });

  it("shows selected values in button text", () => {
    renderFilterBar({ color: ["red", "blue"], size: [] });

    const buttons = screen.getAllByRole("button", {
      name: /Color: Red, Blue/,
    });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("marks selected options with aria-selected", async () => {
    const user = userEvent.setup();
    renderFilterBar({ color: ["red"], size: [] });

    const colorButtons = screen.getAllByRole("button", { name: /Color/ });
    await user.click(colorButtons[colorButtons.length - 1]);

    expect(screen.getByRole("option", { name: /Red/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("option", { name: /Blue/ })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("shows reset button when filters are active", () => {
    renderFilterBar({ color: ["red"], size: [] });

    expect(screen.getByText("Reset filters")).toBeInTheDocument();
  });

  it("hides reset button when no filters are active", () => {
    renderFilterBar({ color: [], size: [] });

    expect(screen.queryByText("Reset filters")).not.toBeInTheDocument();
  });

  it("resets all filters when reset is clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilterBar({ color: ["red"], size: ["small"] });

    await user.click(screen.getByText("Reset filters"));

    expect(onChange).toHaveBeenCalledWith("color", []);
    expect(onChange).toHaveBeenCalledWith("size", []);
  });
});

describe("FilterBar — mobile chips", () => {
  it("shows inline removable chips for active filters", () => {
    renderFilterBar({ color: ["red"], size: [] });

    const removeButtons = screen.getAllByRole("button", { name: /Red/ });
    const removable = removeButtons.find((el) => el.querySelector("svg"));
    expect(removable).toBeInTheDocument();
  });

  it("shows +N more when more than 2 chips are active", () => {
    renderFilterBar({ color: ["red", "blue", "green"], size: [] });

    expect(screen.getByText("+1 more")).toBeInTheDocument();
  });

  it("removes a chip when its remove button is clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilterBar({ color: ["red", "blue"], size: [] });

    const removeButtons = screen.getAllByRole("button", { name: /Red/ });
    const removable = removeButtons.find((el) => el.querySelector("svg"))!;
    await user.click(removable);

    expect(onChange).toHaveBeenCalledWith("color", ["blue"]);
  });
});

describe("FilterBar — mobile bottom sheet", () => {
  it("opens bottom sheet with filter groups", async () => {
    const user = userEvent.setup();
    renderFilterBar();

    const filterButtons = screen.getAllByRole("button");
    const filterIconBtn = filterButtons.find(
      (el) => el.querySelector("svg") && el.className.includes("w-9")
    )!;
    await user.click(filterIconBtn);

    expect(screen.getByText("Filters")).toBeInTheDocument();
  });
});

describe("FilterBar — search", () => {
  it("renders search form when search prop is provided", () => {
    render(
      <FilterBar
        filters={FILTERS}
        values={{ color: [], size: [] }}
        onChange={vi.fn()}
        search={{ placeholder: "Search...", onSearch: vi.fn() }}
      />
    );

    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("calls onSearch when form is submitted", async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();

    render(
      <FilterBar
        filters={FILTERS}
        values={{ color: [], size: [] }}
        onChange={vi.fn()}
        search={{ placeholder: "Search...", onSearch }}
      />
    );

    await user.type(screen.getByPlaceholderText("Search..."), "hello");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).toHaveBeenCalledWith("hello");
  });
});
