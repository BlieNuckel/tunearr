import { render, screen, fireEvent } from "@testing-library/react";
import PurchasePriceModal from "../PurchasePriceModal";

vi.mock("@/context/useSettings", () => ({
  useSettings: () => ({
    settings: {
      spending: { currency: "USD", monthlyLimit: null },
    },
  }),
}));

vi.mock("@/hooks/useIsMobile", () => ({
  default: () => false,
}));

describe("PurchasePriceModal", () => {
  it("does not render when closed", () => {
    render(
      <PurchasePriceModal
        isOpen={false}
        onClose={vi.fn()}
        artistName="Radiohead"
        albumTitle="OK Computer"
        onConfirm={vi.fn()}
      />
    );

    expect(screen.queryByText("Record Purchase")).not.toBeInTheDocument();
  });

  it("renders modal content when open", () => {
    render(
      <PurchasePriceModal
        isOpen={true}
        onClose={vi.fn()}
        artistName="Radiohead"
        albumTitle="OK Computer"
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText("OK Computer by Radiohead")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Record Purchase" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("disables confirm button when no amount entered", () => {
    render(
      <PurchasePriceModal
        isOpen={true}
        onClose={vi.fn()}
        artistName="Radiohead"
        albumTitle="OK Computer"
        onConfirm={vi.fn()}
      />
    );

    const confirmBtn = screen.getByRole("button", { name: "Record Purchase" });
    expect(confirmBtn).toBeDisabled();
  });

  it("calls onConfirm with minor units when amount entered and confirmed", () => {
    const onConfirm = vi.fn();
    render(
      <PurchasePriceModal
        isOpen={true}
        onClose={vi.fn()}
        artistName="Radiohead"
        albumTitle="OK Computer"
        onConfirm={onConfirm}
      />
    );

    const input = screen.getByPlaceholderText("0.00");
    fireEvent.change(input, { target: { value: "9.99" } });

    const confirmBtn = screen.getByRole("button", { name: "Record Purchase" });
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith(999, "USD");
  });

  it("calls onClose when cancel is clicked", () => {
    const onClose = vi.fn();
    render(
      <PurchasePriceModal
        isOpen={true}
        onClose={onClose}
        artistName="Radiohead"
        albumTitle="OK Computer"
        onConfirm={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows currency selector defaulting to configured currency", () => {
    render(
      <PurchasePriceModal
        isOpen={true}
        onClose={vi.fn()}
        artistName="Radiohead"
        albumTitle="OK Computer"
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue("USD — US Dollar")).toBeInTheDocument();
  });
});
