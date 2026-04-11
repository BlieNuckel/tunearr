import { render, screen } from "@testing-library/react";
import SpendingSummary from "../SpendingSummary";

const baseSummary = { week: 999, month: 2499, year: 10000, allTime: 50000 };

describe("SpendingSummary", () => {
  it("renders all four stat cards with formatted amounts", () => {
    render(
      <SpendingSummary
        summary={baseSummary}
        currency="USD"
        monthlyLimit={null}
      />
    );

    expect(screen.getByText("This week")).toBeInTheDocument();
    expect(screen.getByText("$9.99")).toBeInTheDocument();
    expect(screen.getByText("This month")).toBeInTheDocument();
    expect(screen.getByText("$24.99")).toBeInTheDocument();
    expect(screen.getByText("This year")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("All time")).toBeInTheDocument();
    expect(screen.getByText("$500.00")).toBeInTheDocument();
  });

  it("shows no warning when under limit", () => {
    render(
      <SpendingSummary
        summary={baseSummary}
        currency="USD"
        monthlyLimit={5000}
      />
    );

    expect(
      screen.queryByText(/has reached your limit/)
    ).not.toBeInTheDocument();
  });

  it("shows warning when monthly spending reaches limit", () => {
    render(
      <SpendingSummary
        summary={baseSummary}
        currency="USD"
        monthlyLimit={2000}
      />
    );

    expect(screen.getByText(/has reached your limit/)).toBeInTheDocument();
  });

  it("shows no warning when limit is null", () => {
    render(
      <SpendingSummary
        summary={{ ...baseSummary, month: 99999 }}
        currency="USD"
        monthlyLimit={null}
      />
    );

    expect(
      screen.queryByText(/has reached your limit/)
    ).not.toBeInTheDocument();
  });

  it("formats zero-decimal currencies correctly", () => {
    render(
      <SpendingSummary
        summary={{ week: 1000, month: 2000, year: 5000, allTime: 10000 }}
        currency="JPY"
        monthlyLimit={null}
      />
    );

    expect(screen.getByText(/¥1,000/)).toBeInTheDocument();
  });
});
