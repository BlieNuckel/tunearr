import { render, screen } from "@testing-library/react";
import SpendingSummary from "../SpendingSummary";

const baseSummary = { month: 2499, allTime: 50000, albumCount: 12 };

describe("SpendingSummary", () => {
  it("renders monthly and all-time amounts", () => {
    render(
      <SpendingSummary
        summary={baseSummary}
        currency="USD"
        monthlyLimit={null}
      />
    );

    expect(screen.getByText("$24.99")).toBeInTheDocument();
    expect(screen.getByText("$500.00")).toBeInTheDocument();
    expect(
      screen.getByText("Supporting artists this month")
    ).toBeInTheDocument();
    expect(screen.getByText("All-time artist support")).toBeInTheDocument();
  });

  it("shows album count", () => {
    render(
      <SpendingSummary
        summary={baseSummary}
        currency="USD"
        monthlyLimit={null}
      />
    );

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(/albums purchased/)).toBeInTheDocument();
  });

  it("shows singular 'album' for count of 1", () => {
    render(
      <SpendingSummary
        summary={{ month: 999, allTime: 999, albumCount: 1 }}
        currency="USD"
        monthlyLimit={null}
      />
    );

    expect(screen.getByText(/album purchased/)).toBeInTheDocument();
  });

  it("shows limit progress bar when limit is set", () => {
    render(
      <SpendingSummary
        summary={baseSummary}
        currency="USD"
        monthlyLimit={5000}
      />
    );

    expect(screen.getByText(/of \$50\.00/)).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("shows warning when over limit", () => {
    render(
      <SpendingSummary
        summary={baseSummary}
        currency="USD"
        monthlyLimit={2000}
      />
    );

    expect(
      screen.getByText("You've reached your monthly budget!")
    ).toBeInTheDocument();
  });

  it("shows no limit bar when limit is null", () => {
    render(
      <SpendingSummary
        summary={baseSummary}
        currency="USD"
        monthlyLimit={null}
      />
    );

    expect(
      screen.queryByText("You've reached your monthly budget!")
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("shows streaming comparison for large spend", () => {
    render(
      <SpendingSummary
        summary={{ month: 0, allTime: 5997, albumCount: 5 }}
        currency="USD"
        monthlyLimit={null}
      />
    );

    expect(screen.getByText(/Equivalent to/)).toBeInTheDocument();
    expect(screen.getByText(/Spotify/)).toBeInTheDocument();
  });

  it("hides streaming comparison for small spend", () => {
    render(
      <SpendingSummary
        summary={{ month: 0, allTime: 500, albumCount: 1 }}
        currency="USD"
        monthlyLimit={null}
      />
    );

    expect(screen.queryByText(/Equivalent to/)).not.toBeInTheDocument();
  });
});
