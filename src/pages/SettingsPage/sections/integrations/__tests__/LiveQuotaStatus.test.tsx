import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LiveQuotaStatus from "../LiveQuotaStatus";
import type { LiveQuotaStatus as QuotaStatus } from "@/types";

const mockFetch = vi.fn();

const STATUS: QuotaStatus = {
  plan: "developer",
  used: 400,
  quota: 1000,
  ratio: 0.4,
  overageCalls: 0,
  periodStart: "2026-11-17T13:01:29.213Z",
  periodEnd: "2026-12-17T13:01:29.213Z",
  allowOverage: false,
  blocked: false,
  source: "jambase",
  checkedAt: "2026-11-20T12:00:00.000Z",
};

function respond(overrides: Partial<QuotaStatus> = {}) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ ...STATUS, ...overrides }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LiveQuotaStatus", () => {
  it("shows JamBase's usage, plan and reset date", async () => {
    respond();

    render(<LiveQuotaStatus enabled />);

    expect(
      await screen.findByText("400 of 1000 calls used this period (40%)")
    ).toBeInTheDocument();
    expect(screen.getByText(/^Developer plan, resets /)).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/live/quota",
      expect.anything()
    );
  });

  it("no longer shows the roster projection", async () => {
    respond();

    render(<LiveQuotaStatus enabled />);

    await screen.findByText(/calls used this period/);
    expect(screen.queryByText(/projects to about/)).not.toBeInTheDocument();
    expect(screen.queryByText(/more artists fit/)).not.toBeInTheDocument();
  });

  it("says lookups are paused once blocked", async () => {
    respond({ used: 1000, ratio: 1, blocked: true });

    render(<LiveQuotaStatus enabled />);

    expect(
      await screen.findByText("Lookups are paused until the period resets.")
    ).toBeInTheDocument();
  });

  it("shows billed overage calls", async () => {
    respond({ used: 1200, ratio: 1.2, overageCalls: 200, allowOverage: true });

    render(<LiveQuotaStatus enabled />);

    expect(
      await screen.findByText(
        "200 calls past the plan quota, billed by JamBase."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/paused/)).not.toBeInTheDocument();
  });

  it("describes a plan without a monthly cap", async () => {
    respond({ quota: null, ratio: null, used: 5000 });

    render(<LiveQuotaStatus enabled />);

    expect(
      await screen.findByText("5000 calls used this period, no monthly cap")
    ).toBeInTheDocument();
  });

  it("says when the figure is our own count because JamBase was unreachable", async () => {
    respond({ source: "local" });

    render(<LiveQuotaStatus enabled />);

    expect(
      await screen.findByText(/Could not reach JamBase just now/)
    ).toBeInTheDocument();
  });

  it("waits for JamBase's first answer before showing usage", async () => {
    respond({
      source: "unknown",
      plan: null,
      quota: null,
      ratio: null,
      used: 0,
      periodEnd: null,
      checkedAt: null,
    });

    render(<LiveQuotaStatus enabled />);

    expect(
      await screen.findByText(/once JamBase has answered/)
    ).toBeInTheDocument();
  });

  it("does not ask for usage while live events are off", () => {
    render(<LiveQuotaStatus enabled={false} />);

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
