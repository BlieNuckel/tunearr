import { render, screen, fireEvent } from "@testing-library/react";
import FileUploadZone from "../FileUploadZone";

describe("FileUploadZone", () => {
  it("renders drop zone text", () => {
    render(<FileUploadZone onFiles={vi.fn()} />);
    expect(
      screen.getByText("Drop audio files here or click to browse")
    ).toBeInTheDocument();
    expect(
      screen.getByText("FLAC, MP3, OGG, WAV, M4A, AAC")
    ).toBeInTheDocument();
  });

  it("calls onFiles when files are selected via input", () => {
    const onFiles = vi.fn();
    render(<FileUploadZone onFiles={onFiles} />);

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(["audio"], "track.flac", { type: "audio/flac" });
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    expect(onFiles).toHaveBeenCalledTimes(1);
  });

  it("calls onFiles on drop", () => {
    const onFiles = vi.fn();
    render(<FileUploadZone onFiles={onFiles} />);

    const dropZone = screen
      .getByText("Drop audio files here or click to browse")
      .closest("div")!;
    const file = new File(["audio"], "track.mp3", { type: "audio/mpeg" });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(onFiles).toHaveBeenCalledTimes(1);
  });

  it("prevents default on dragover", () => {
    render(<FileUploadZone onFiles={vi.fn()} />);
    const dropZone = screen
      .getByText("Drop audio files here or click to browse")
      .closest("div")!;

    const event = new Event("dragover", { bubbles: true, cancelable: true });
    dropZone.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("has a hidden file input with correct accept types", () => {
    render(<FileUploadZone onFiles={vi.fn()} />);
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(input).toHaveAttribute("accept", ".flac,.mp3,.ogg,.wav,.m4a,.aac");
    expect(input).toHaveAttribute("multiple");
    expect(input).toHaveClass("hidden");
  });
});
