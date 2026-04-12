import { render, screen } from "@testing-library/react";
import PurchaseDecisionBanner from "../PurchaseDecisionBanner";
import type { PurchaseContext } from "@/hooks/usePurchaseContext";

const buyContext: PurchaseContext = {
  recommendation: "buy",
  signals: [
    {
      factor: "label",
      recommendation: "buy",
      reason: "Warp Records is not on your blocklist",
    },
  ],
  label: { name: "Warp Records", mbid: "label-warp" },
};

const requestContext: PurchaseContext = {
  recommendation: "request",
  signals: [
    {
      factor: "label",
      recommendation: "request",
      reason: "Universal Music is on your blocklist",
    },
  ],
  label: { name: "Universal Music", mbid: "label-umg" },
};

const neutralContext: PurchaseContext = {
  recommendation: "neutral",
  signals: [],
  label: null,
};

describe("PurchaseDecisionBanner", () => {
  it("renders loading state with spinner and step text", () => {
    render(
      <PurchaseDecisionBanner
        context={null}
        loading={true}
        progress={{ step: "Looking up album details" }}
      />
    );
    expect(screen.getByTestId("purchase-banner-loading")).toBeInTheDocument();
    expect(screen.getByText("Looking up album details")).toBeInTheDocument();
  });

  it("renders loading state with step and detail text", () => {
    render(
      <PurchaseDecisionBanner
        context={null}
        loading={true}
        progress={{ step: "Resolving label ownership", detail: "Atlantic" }}
      />
    );
    expect(screen.getByText("Resolving label ownership")).toBeInTheDocument();
    expect(screen.getByText("Atlantic")).toBeInTheDocument();
  });

  it("renders fallback loading text when progress is null", () => {
    render(
      <PurchaseDecisionBanner context={null} loading={true} progress={null} />
    );
    expect(screen.getByTestId("purchase-banner-loading")).toBeInTheDocument();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders nothing when context is null and not loading", () => {
    const { container } = render(
      <PurchaseDecisionBanner context={null} loading={false} progress={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for neutral recommendation", () => {
    const { container } = render(
      <PurchaseDecisionBanner
        context={neutralContext}
        loading={false}
        progress={null}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders request banner with heading and deciding signal reason", () => {
    render(
      <PurchaseDecisionBanner
        context={requestContext}
        loading={false}
        progress={null}
      />
    );
    expect(screen.getByTestId("purchase-banner-request")).toBeInTheDocument();
    expect(screen.getByText("Consider requesting")).toBeInTheDocument();
    expect(
      screen.getByText("Universal Music is on your blocklist")
    ).toBeInTheDocument();
  });

  it("renders buy banner with heading and deciding signal reason", () => {
    render(
      <PurchaseDecisionBanner
        context={buyContext}
        loading={false}
        progress={null}
      />
    );
    expect(screen.getByTestId("purchase-banner-buy")).toBeInTheDocument();
    expect(screen.getByText("Consider purchasing")).toBeInTheDocument();
    expect(
      screen.getByText("Warp Records is not on your blocklist")
    ).toBeInTheDocument();
  });

  it("shows only the last signal matching the final recommendation", () => {
    const mixedContext: PurchaseContext = {
      recommendation: "request",
      signals: [
        { factor: "label", recommendation: "buy", reason: "Label is fine" },
        {
          factor: "age",
          recommendation: "request",
          reason:
            "Released in 1960 — the artist may no longer benefit from sales",
        },
      ],
      label: { name: "Warp Records", mbid: "label-warp" },
    };
    render(
      <PurchaseDecisionBanner
        context={mixedContext}
        loading={false}
        progress={null}
      />
    );
    expect(
      screen.getByText(
        "Released in 1960 — the artist may no longer benefit from sales"
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Label is fine")).not.toBeInTheDocument();
  });

  it("does not render label info links", () => {
    render(
      <PurchaseDecisionBanner
        context={buyContext}
        loading={false}
        progress={null}
      />
    );
    expect(screen.queryByText("MusicBrainz")).not.toBeInTheDocument();
    expect(screen.queryByText("Wikipedia")).not.toBeInTheDocument();
  });
});
