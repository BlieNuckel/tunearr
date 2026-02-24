import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SlskdSection from "../SlskdSection";

describe("SlskdSection", () => {
  const defaultProps = {
    url: "",
    apiKey: "",
    downloadPath: "",
    onUrlChange: vi.fn(),
    onApiKeyChange: vi.fn(),
    onDownloadPathChange: vi.fn(),
    isConnected: false,
    autoSetupStatus: null,
    autoSetupLoading: false,
    onAutoSetup: vi.fn(),
  };

  it("renders all three input fields", () => {
    render(<SlskdSection {...defaultProps} />);

    expect(screen.getByText("slskd (Soulseek)")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("http://slskd:5030")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter slskd API key")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("/downloads/slskd/complete")
    ).toBeInTheDocument();
  });

  it("displays current values", () => {
    render(
      <SlskdSection
        {...defaultProps}
        url="http://my-slskd:5030"
        apiKey="my-key"
        downloadPath="/my/path"
      />
    );

    expect(
      screen.getByDisplayValue("http://my-slskd:5030")
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("my-key")).toBeInTheDocument();
    expect(screen.getByDisplayValue("/my/path")).toBeInTheDocument();
  });

  it("calls onUrlChange when URL is typed", async () => {
    const onUrlChange = vi.fn();
    render(<SlskdSection {...defaultProps} onUrlChange={onUrlChange} />);

    const input = screen.getByPlaceholderText("http://slskd:5030");
    await userEvent.type(input, "x");
    expect(onUrlChange).toHaveBeenCalledWith("x");
  });

  it("calls onApiKeyChange when API key is typed", async () => {
    const onApiKeyChange = vi.fn();
    render(<SlskdSection {...defaultProps} onApiKeyChange={onApiKeyChange} />);

    const input = screen.getByPlaceholderText("Enter slskd API key");
    await userEvent.type(input, "k");
    expect(onApiKeyChange).toHaveBeenCalledWith("k");
  });

  it("calls onDownloadPathChange when path is typed", async () => {
    const onDownloadPathChange = vi.fn();
    render(
      <SlskdSection
        {...defaultProps}
        onDownloadPathChange={onDownloadPathChange}
      />
    );

    const input = screen.getByPlaceholderText("/downloads/slskd/complete");
    await userEvent.type(input, "/");
    expect(onDownloadPathChange).toHaveBeenCalledWith("/");
  });

  it("shows description text for download path", () => {
    render(<SlskdSection {...defaultProps} />);

    expect(screen.getByText(/shared volume mount/i)).toBeInTheDocument();
  });

  describe("auto-setup button", () => {
    it("is disabled when not connected", () => {
      render(
        <SlskdSection {...defaultProps} isConnected={false} />
      );

      const button = screen.getByRole("button", {
        name: /set up in lidarr/i,
      });
      expect(button).toBeDisabled();
    });

    it("shows loading text when checking status", () => {
      render(
        <SlskdSection
          {...defaultProps}
          isConnected={true}
          autoSetupLoading={true}
        />
      );

      expect(screen.getByText("Checking…")).toBeInTheDocument();
    });

    it("shows ready state when connected and not already set up", () => {
      render(
        <SlskdSection
          {...defaultProps}
          isConnected={true}
          autoSetupStatus={{ indexerExists: false, downloadClientExists: false }}
        />
      );

      const button = screen.getByRole("button", {
        name: /set up in lidarr/i,
      });
      expect(button).not.toBeDisabled();
    });

    it("shows added state when both exist", () => {
      render(
        <SlskdSection
          {...defaultProps}
          isConnected={true}
          autoSetupStatus={{ indexerExists: true, downloadClientExists: true }}
        />
      );

      const button = screen.getByRole("button", {
        name: /added to lidarr/i,
      });
      expect(button).toBeDisabled();
    });

    it("shows ready state when only one exists", () => {
      render(
        <SlskdSection
          {...defaultProps}
          isConnected={true}
          autoSetupStatus={{ indexerExists: true, downloadClientExists: false }}
        />
      );

      const button = screen.getByRole("button", {
        name: /set up in lidarr/i,
      });
      expect(button).not.toBeDisabled();
    });

    it("calls onAutoSetup when clicked", async () => {
      const onAutoSetup = vi.fn();
      render(
        <SlskdSection
          {...defaultProps}
          isConnected={true}
          autoSetupStatus={{ indexerExists: false, downloadClientExists: false }}
          onAutoSetup={onAutoSetup}
        />
      );

      await userEvent.click(
        screen.getByRole("button", { name: /set up in lidarr/i })
      );
      expect(onAutoSetup).toHaveBeenCalled();
    });
  });
});
