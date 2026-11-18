import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CurrencyChangeConfirm from "../CurrencyChangeConfirm";

vi.mock("@/hooks/useIsMobile", () => ({
  default: () => false,
}));

function mockSummary(response: { ok: boolean; albumCount?: number }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    json: async () => ({
      currency: "USD",
      monthlyLimit: null,
      month: 0,
      allTime: 0,
      albumCount: response.albumCount ?? 0,
    }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderConfirm(
  props: Partial<Parameters<typeof CurrencyChangeConfirm>[0]> = {}
) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <CurrencyChangeConfirm
      to="EUR"
      from="USD"
      monthlyLimit={null}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />
  );
  return { onConfirm, onCancel };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("CurrencyChangeConfirm", () => {
  it("does not render or fetch while closed", () => {
    const fetchMock = mockSummary({ ok: true });
    renderConfirm({ to: null });

    expect(screen.queryByText(/Switch to/)).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("counts a single purchase in the old currency", async () => {
    mockSummary({ ok: true, albumCount: 1 });
    renderConfirm();

    expect(
      await screen.findByText(
        "Your 1 purchase recorded in USD will no longer count toward your totals or your monthly limit. It won't be converted."
      )
    ).toBeInTheDocument();
  });

  it("leaves the purchases line out when there are none", async () => {
    const fetchMock = mockSummary({ ok: true, albumCount: 0 });
    renderConfirm();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(
      screen.getByText("New purchases will be recorded in EUR.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/will no longer count/)).not.toBeInTheDocument();
  });

  it("still warns without a count when the summary can't be loaded", async () => {
    mockSummary({ ok: false });
    renderConfirm();

    expect(
      await screen.findByText(/^Purchases recorded in USD will no longer count/)
    ).toBeInTheDocument();
  });

  it("says the limit will be cleared, in the old currency", async () => {
    mockSummary({ ok: true });
    renderConfirm({ from: "JPY", to: "USD", monthlyLimit: 5000 });

    expect(
      screen.getByText(
        "Your monthly limit of ¥5,000 will be cleared. You can set a new one in USD."
      )
    ).toBeInTheDocument();
  });

  it("confirms with the new currency or cancels", () => {
    mockSummary({ ok: true });
    const { onConfirm, onCancel } = renderConfirm();

    fireEvent.click(screen.getByRole("button", { name: "Switch to EUR" }));
    expect(onConfirm).toHaveBeenCalledWith("EUR");

    fireEvent.click(screen.getByRole("button", { name: "Keep USD" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
