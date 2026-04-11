import { render, screen, fireEvent } from "@testing-library/react";
import SpendingSection from "../SpendingSection";
import type { SpendingSettings } from "@/context/settingsContextDef";

const defaultSpending: SpendingSettings = {
  currency: "USD",
  monthlyLimit: null,
};

describe("SpendingSection", () => {
  it("renders currency dropdown with current value", () => {
    render(
      <SpendingSection spending={defaultSpending} onSpendingChange={vi.fn()} />
    );

    const select = screen.getByDisplayValue("USD — US Dollar");
    expect(select).toBeInTheDocument();
  });

  it("calls onSpendingChange when currency changes", () => {
    const onChange = vi.fn();
    render(
      <SpendingSection spending={defaultSpending} onSpendingChange={onChange} />
    );

    const select = screen.getByDisplayValue("USD — US Dollar");
    fireEvent.change(select, { target: { value: "EUR" } });

    expect(onChange).toHaveBeenCalledWith({
      ...defaultSpending,
      currency: "EUR",
    });
  });

  it("renders empty limit input when monthlyLimit is null", () => {
    render(
      <SpendingSection spending={defaultSpending} onSpendingChange={vi.fn()} />
    );

    const input = screen.getByPlaceholderText("No limit");
    expect(input).toHaveValue(null);
  });

  it("renders limit value in major units", () => {
    render(
      <SpendingSection
        spending={{ currency: "USD", monthlyLimit: 5000 }}
        onSpendingChange={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("No limit");
    expect(input).toHaveValue(50);
  });

  it("calls onSpendingChange with minor units when limit changes", () => {
    const onChange = vi.fn();
    render(
      <SpendingSection spending={defaultSpending} onSpendingChange={onChange} />
    );

    const input = screen.getByPlaceholderText("No limit");
    fireEvent.change(input, { target: { value: "50" } });

    expect(onChange).toHaveBeenCalledWith({
      ...defaultSpending,
      monthlyLimit: 5000,
    });
  });

  it("sets monthlyLimit to null when input cleared", () => {
    const onChange = vi.fn();
    render(
      <SpendingSection
        spending={{ currency: "USD", monthlyLimit: 5000 }}
        onSpendingChange={onChange}
      />
    );

    const input = screen.getByPlaceholderText("No limit");
    fireEvent.change(input, { target: { value: "" } });

    expect(onChange).toHaveBeenCalledWith({
      currency: "USD",
      monthlyLimit: null,
    });
  });

  it("shows warning about currency changes", () => {
    render(
      <SpendingSection spending={defaultSpending} onSpendingChange={vi.fn()} />
    );

    expect(
      screen.getByText(/won't convert existing purchase records/)
    ).toBeInTheDocument();
  });
});
