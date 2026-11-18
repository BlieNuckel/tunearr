import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PurchasePriceModal from "../PurchasePriceModal";
import type { SpendingSettings } from "@shared/currency";

const mockUseSpendingSettings = vi.fn();

vi.mock("@/hooks/useSpendingSettings", () => ({
  default: (enabled: boolean) => mockUseSpendingSettings(enabled),
}));

vi.mock("@/hooks/useIsMobile", () => ({
  default: () => false,
}));

function withSpending(
  spending: SpendingSettings | null,
  error: string | null = null
) {
  mockUseSpendingSettings.mockReturnValue({
    spending,
    loading: spending === null && error === null,
    error,
    save: vi.fn(),
  });
}

function renderModal(
  props: Partial<React.ComponentProps<typeof PurchasePriceModal>> = {}
) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  const result = render(
    <MemoryRouter initialEntries={["/album/rg-1"]}>
      <Routes>
        <Route
          path="/album/:mbid"
          element={
            <PurchasePriceModal
              isOpen={true}
              onClose={onClose}
              artistName="Radiohead"
              albumTitle="OK Computer"
              onConfirm={onConfirm}
              {...props}
            />
          }
        />
        <Route path="/settings/general" element={<p>General settings</p>} />
      </Routes>
    </MemoryRouter>
  );
  return { ...result, onConfirm, onClose };
}

beforeEach(() => {
  withSpending({ currency: "USD", monthlyLimit: null });
});

describe("PurchasePriceModal", () => {
  it("does not render when closed", () => {
    renderModal({ isOpen: false });

    expect(screen.queryByText("Record Purchase")).not.toBeInTheDocument();
  });

  it("renders modal content when open", () => {
    renderModal();

    expect(screen.getByText("OK Computer by Radiohead")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Record Purchase" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("disables confirm button when no amount entered", () => {
    renderModal();

    expect(
      screen.getByRole("button", { name: "Record Purchase" })
    ).toBeDisabled();
  });

  it("calls onConfirm with minor units when amount entered and confirmed", () => {
    const { onConfirm, onClose } = renderModal();

    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "9.99" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record Purchase" }));

    expect(onConfirm).toHaveBeenCalledWith(999);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when cancel is clicked", () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("records in the user's own currency, with no way to pick another", () => {
    withSpending({ currency: "JPY", monthlyLimit: null });
    const { onConfirm } = renderModal();

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Price (JPY)"), {
      target: { value: "1500" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record Purchase" }));

    expect(onConfirm).toHaveBeenCalledWith(1500);
  });

  it("only asks for the user's settings while open", () => {
    const { rerender } = renderModal({ isOpen: false });
    expect(mockUseSpendingSettings).toHaveBeenLastCalledWith(false);

    rerender(
      <MemoryRouter>
        <PurchasePriceModal
          isOpen={true}
          onClose={vi.fn()}
          artistName="Radiohead"
          albumTitle="OK Computer"
          onConfirm={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(mockUseSpendingSettings).toHaveBeenLastCalledWith(true);
  });

  it("shows neither form nor setup while the user's settings load", () => {
    withSpending(null);
    renderModal();

    expect(
      screen.queryByRole("button", { name: "Record Purchase" })
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Set up purchases")).not.toBeInTheDocument();
  });

  it("says so when the user's settings can't be loaded", () => {
    withSpending(null, "Failed to load spending settings");
    renderModal();

    expect(
      screen.getByText("Could not load your purchase settings")
    ).toBeInTheDocument();
  });

  describe("before the user has chosen a currency", () => {
    beforeEach(() => {
      withSpending({ currency: null, monthlyLimit: null });
    });

    it("shows the setup state instead of the price form", () => {
      renderModal();

      expect(screen.getByText("Set up purchases")).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("0.00")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Record Purchase" })
      ).not.toBeInTheDocument();
    });

    it("links to the general settings and closes the modal", () => {
      const { onClose } = renderModal();

      fireEvent.click(screen.getByRole("link", { name: "Go to settings" }));

      expect(onClose).toHaveBeenCalled();
      expect(screen.getByText("General settings")).toBeInTheDocument();
    });

    it("can be dismissed", () => {
      const { onClose, onConfirm } = renderModal();

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(onClose).toHaveBeenCalled();
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });
});
