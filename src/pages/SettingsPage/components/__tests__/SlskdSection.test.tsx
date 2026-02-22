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
  };

  it("renders all three input fields", () => {
    render(<SlskdSection {...defaultProps} />);

    expect(screen.getByText("slskd (Soulseek)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("http://slskd:5030")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter slskd API key")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("/downloads/slskd/complete")).toBeInTheDocument();
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

    expect(screen.getByDisplayValue("http://my-slskd:5030")).toBeInTheDocument();
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
      <SlskdSection {...defaultProps} onDownloadPathChange={onDownloadPathChange} />
    );

    const input = screen.getByPlaceholderText("/downloads/slskd/complete");
    await userEvent.type(input, "/");
    expect(onDownloadPathChange).toHaveBeenCalledWith("/");
  });

  it("shows description text for download path", () => {
    render(<SlskdSection {...defaultProps} />);

    expect(
      screen.getByText(/shared volume mount/i)
    ).toBeInTheDocument();
  });
});
