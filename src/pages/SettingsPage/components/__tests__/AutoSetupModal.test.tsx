import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AutoSetupModal from "../AutoSetupModal";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AutoSetupModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  it("renders with default host and port values", () => {
    render(<AutoSetupModal {...defaultProps} />);

    expect(screen.getByDisplayValue("tunearr")).toBeInTheDocument();
    expect(screen.getByDisplayValue("3001")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<AutoSetupModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText("Set Up in Lidarr")).not.toBeInTheDocument();
  });

  it("calls onSuccess and onClose on full success", async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          indexer: { success: true },
          downloadClient: { success: true },
        }),
        { status: 200 }
      )
    );

    render(
      <AutoSetupModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />
    );

    await userEvent.click(screen.getByRole("button", { name: /set up/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
    expect(onClose).toHaveBeenCalled();

    expect(fetch).toHaveBeenCalledWith("/api/lidarr/auto-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host: "tunearr", port: 3001 }),
    });
  });

  it("shows inline results on partial failure and stays open", async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          indexer: { success: true },
          downloadClient: { success: false, error: "Validation failed" },
        }),
        { status: 200 }
      )
    );

    render(
      <AutoSetupModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />
    );

    await userEvent.click(screen.getByRole("button", { name: /set up/i }));

    await waitFor(() => {
      expect(screen.getByText(/Created/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Validation failed/)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows error state on network failure", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

    render(<AutoSetupModal {...defaultProps} />);

    await userEvent.click(screen.getByRole("button", { name: /set up/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Request failed/)).toHaveLength(2);
    });
  });

  it("submits with custom host and port", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          indexer: { success: true },
          downloadClient: { success: true },
        }),
        { status: 200 }
      )
    );

    render(<AutoSetupModal {...defaultProps} />);

    const hostInput = screen.getByDisplayValue("tunearr");
    const portInput = screen.getByDisplayValue("3001");

    await userEvent.clear(hostInput);
    await userEvent.type(hostInput, "myhost");
    await userEvent.clear(portInput);
    await userEvent.type(portInput, "4000");

    await userEvent.click(screen.getByRole("button", { name: /set up/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/lidarr/auto-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: "myhost", port: 4000 }),
      });
    });
  });

  it("calls onClose when cancel is clicked", async () => {
    const onClose = vi.fn();
    render(
      <AutoSetupModal isOpen={true} onClose={onClose} onSuccess={vi.fn()} />
    );

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
